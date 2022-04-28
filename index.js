const ahocorasick = require('ahocorasick');
const accents = require('remove-accents');

const {
    isIntersecting,
    mergeOptions,
    parseResults,
    spliceString,
} = require('./utils');

class GoodCensor {
    constructor(words=[],defaultOptions={}){
        this.badwords = words;
        this.defaultOptions = defaultOptions;
        this.ahocorasick = new ahocorasick(words);
    }

    censor(text,currentOptions={}){
        const options = mergeOptions(this.defaultOptions,currentOptions);
        
        if(typeof text != 'string') return '';
    
        const parsedOptions = {};
    
        [
            ['censorText','string','*'],
            ['censorLoop','boolean',true],
            ['censorLongest','boolean',true],
            ['censorSlice','boolean',true],
            ['censorAccents','boolean',true],
            ['censorStart','number',0],
            ['censorEnd','number',0],
            ['ignore',RegExp,/(?!)/]
        ]
        .forEach(([key,type,normal]) => {
            parsedOptions[key] =
                (
                    typeof type == 'string' ?
                        typeof options[key] == type :
                        options[key] instanceof type
                ) ?
                    options[key] :
                    normal;
        });
    
        parsedOptions.censorStart = parsedOptions.censorStart || 0;
        parsedOptions.censorEnd = parsedOptions.censorEnd || 0;
    
        let PHText = text.toLowerCase(); // "placeholder"
        if(parsedOptions.censorAccents) PHText = accents.remove(PHText);
        const results = this.ahocorasick.search(PHText);
        const parsedResults = parseResults(
            results,
            parsedOptions.censorLongest
        )
        .reverse();
    
        const ignoreRegex = new RegExp(parsedOptions.ignore,'iy');
        const ignore = [];
        
        for(let i = 0; i < text.length; i++){
            ignoreRegex.lastIndex = i;
            const res = ignoreRegex.exec(text);
            if(!res) continue;
            ignore.push([
                res.index,
                res[0].length,
            ]);
        }
    
        for(const [index,length] of parsedResults){
            if(isIntersecting([index,index+length],ignore)) continue;
    
            const count = length -
                parsedOptions.censorStart -
                parsedOptions.censorEnd;
    
            if(count <= 0) continue;
    
            const start = parseInt(index) + parsedOptions.censorStart;
    
            let censorText = parsedOptions.censorText;
            if(parsedOptions.censorLoop && censorText.length > 0)
                while(censorText.length < count)
                    censorText = censorText + parsedOptions.censorText;
    
            if(parsedOptions.censorSlice)
                censorText = censorText.slice(0,count);
    
            text = spliceString(text, start, count, censorText);
        }
    
        return text;
    }
    check(string='',currentOptions){
        if(typeof string != 'string') string = '';
        return string != this.censor(string,currentOptions);
    }
}

module.exports = GoodCensor;
