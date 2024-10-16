async function checkRootFolder(files){
    let root = files[0].webkitRelativePath.split("/")[0]
    if(root == "back" || root == "exp" || root == "female" || root == "icons" || root == "shiny" || root == "variant"){
        root = "placeholder"
    }
    if(root){
        if(root == "placeholder"){
            createList(`Folder structure: ${files[0].webkitRelativePath}`)
        }
        else{
            createList(`Folder structure: ${root}`)
        }
        let spritePath = {}

        for(let i = 0; i < files.length; i++){
            if(files[i].type == "image/png"){
                if(!(files[i].name in spritePath)){
                    spritePath[files[i].webkitRelativePath] = {"name": files[i].name, "ignore": false}
                }
            }
            else{
                report("error", `Unknown file: ${files[i].webkitRelativePath}`)
            }
        }

        if(Object.keys(spritePath).length > 0){
            await validateFiles(files, spritePath, root)
        }
        else{
            report("error", "Couldn't find any image/png.")
        }
    }
    else{
        report("error", "Couldn't find root folder name.")
    }
}





async function validateFiles(files, spritePath, root){
    spritePath = await returnSpritePathInfo(spritePath)
    if(spritePath){
        if(root != "placeholder"){
            let validateStructure = returnValidateStructure(spritePath, root)
            for(let i = 0; i < files.length; i++){
                if(!(files[i].webkitRelativePath in validateStructure)){
                    if(files[i].webkitRelativePath in spritePath && !spritePath[files[i].webkitRelativePath]["ignore"]){
                        report("error", `Unexpected file: ${replaceRoot(files[i].webkitRelativePath)}`)
                    }
                }
                else if(validateStructure[files[i].webkitRelativePath] === false){
                    validateStructure[files[i].webkitRelativePath] = true
                }
                else{
                    report("error", `Unexpected behavior during validateFiles.`)
                }
            }
            Object.keys(validateStructure).forEach(path => {
                if(validateStructure[path] === false && /_(?:1|2|3)\.png$/.test(path)){
                    report("warning", `Couldn't find file: ${replaceRoot(path)}`)
                }
            })
        }
        else{
            report("valid", "Incomplete folder structure, ignored.")
        }

        report("valid")
        await checkSprites(files, spritePath)
    }
    else{
        report("error", "Something went terribly wrong!")
    }
}






function returnValidateStructure(spritePath, root){
    let validateStructure = {}
    Object.keys(spritePath).forEach(key => {
        if(!spritePath[key]["ignore"]){
            let fileName = spritePath[key]["name"]
            if(/_(?:1|2|3)\.png$/.test(spritePath[key]["name"])){
                validateStructure[`${root}/variant/${fileName}`] = false; validateStructure[`${root}/variant/back/${fileName}`] = false; validateStructure[`${root}/icons/variant/${spritePath[key]["gen"]}/${fileName}`] = false
                if(spritePath[key]["female"]){
                    validateStructure[`${root}/variant/female/${fileName}`] = false; validateStructure[`${root}/variant/back/female/${fileName}`] = false
                }
                if(spritePath[key]["exp"]){
                    validateStructure[`${root}/variant/exp/${fileName}`] = false; validateStructure[`${root}/variant/exp/back/${fileName}`] = false
                }
                //if(spritePath[key]["exp"] && spritePath[key]["female"]){}
            }
            else{
                if(/icons\//.test(key)){
                    validateStructure[`${root}/icons/${spritePath[key]["gen"]}/${fileName}`] = false
                    fileName = spritePath[key]["name"].match(/(\d+)s?(?:-?f)?.*?\.png/)[1]
                    if(spritePath[key]["female"]){
                        validateStructure[`${root}/icons/${spritePath[key]["gen"]}/${fileName}-f.png`] = false; validateStructure[`${root}/icons/${spritePath[key]["gen"]}/${fileName}s-f.png`] = false
                    }
                    validateStructure[`${root}/icons/${spritePath[key]["gen"]}/${fileName}s.png`] = false
                }
                fileName = baseShinyIcon(spritePath[key]["name"])

                validateStructure[`${root}/${fileName}`] = false; validateStructure[`${root}/back/${fileName}`] = false;
                if(spritePath[key]["female"]){
                    validateStructure[`${root}/female/${fileName}`] = false; validateStructure[`${root}/back/female/${fileName}`] = false
                }
                if(spritePath[key]["exp"]){
                    validateStructure[`${root}/exp/${fileName}`] = false; validateStructure[`${root}/exp/back/${fileName}`] = false
                }
                if(/shiny\//.test(key) || /icons\/\d+\/\d+s/.test(key)){
                    validateStructure[`${root}/back/shiny/${fileName}`] = false; validateStructure[`${root}/shiny/${fileName}`] = false
                    if(spritePath[key]["exp"]){
                        validateStructure[`${root}/exp/shiny/${fileName}`] = false; validateStructure[`${root}/exp/back/shiny/${fileName}`] = false
                    }
                    if(spritePath[key]["female"]){
                        validateStructure[`${root}/shiny/female/${fileName}`] = false; validateStructure[`${root}/back/shiny/female/${fileName}`] = false
                    }
                }
            }
        }
    })

    return validateStructure
}