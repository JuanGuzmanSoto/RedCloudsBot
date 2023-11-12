//processArgs.js

module.exports={
    preprocessArgs
}




//Checks if the argument contained quotations to store as a single string. (Spaced usernames) 
function preprocessArgs(args){
    let processedArgs = []; 
    let currentArgs = '';
    let quoteOpen = false;
    for(const arg of args){
        if(arg.startsWith('"')&&arg.endsWith('"')&&arg.length>1){
            processedArgs.push(arg.slice(1,-1));
        }else if (arg.startsWith('"')){
            currentArgs = arg.slice(1);
            quoteOpen = true; 
        }else if (arg.endsWith('"')){
            currentArgs += ' ' + arg.slice(0,-1);
            processedArgs.push(currentArgs);
            currentArgs = '';
            quoteOpen = false;
        }else if (quoteOpen){
            currentArgs += ' ' + arg;
        }else{
            processedArgs.push(arg);
        }
    }
    if(quoteOpen){
        processedArgs.push(currentArgs);
    }
    return processedArgs;
}