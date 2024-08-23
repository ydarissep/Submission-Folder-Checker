async function checkRootFolder(files){
    const root = files[0].webkitRelativePath.split("/")[0]
    if(root){
        createList(`Folder structure: ${root}`)
        let spritePath = {}

        for(let i = 0; i < files.length; i++){
            if(files[i].type == "image/png"){
                if(!(files[i].name in spritePath)){
                    spritePath[files[i].webkitRelativePath] = {"name": files[i].name, "ignore": false}
                }
            }
            else{
                report("error", `Unknown file: ${replaceRoot(files[i].webkitRelativePath)}`)
            }
        }

        if(Object.keys(spritePath).length > 0){
            await validateFiles(files, spritePath)
        }
        else{
            report("error", "Couldn't find any image/png.")
        }
    }
    else{
        report("error", "Couldn't find root folder name.")
    }
}





async function validateFiles(files, spritePath){
    const root = files[0].webkitRelativePath.split("/")[0]
    spritePath = await returnSpritePathInfo(spritePath)
    if(spritePath){
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
            if(validateStructure[path] === false){
                report("warning", `Couldn't find file: ${replaceRoot(path)}`)
            }
        })

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
                validateStructure[`${root}/${fileName}`] = false; validateStructure[`${root}/back/${fileName}`] = false; validateStructure[`${root}/icons/${spritePath[key]["gen"]}/${fileName}`] = false
                if(spritePath[key]["female"]){
                    validateStructure[`${root}/female/${fileName}`] = false; validateStructure[`${root}/back/female/${fileName}`] = false
                }
                if(spritePath[key]["exp"]){
                    validateStructure[`${root}/exp/${fileName}`] = false; validateStructure[`${root}/exp/back/${fileName}`] = false
                }
                //if(spritePath[key]["exp"] && spritePath[key]["female"]){}
            }
            else{
                if(/\/icons\//.test(key)){
                    validateStructure[`${root}/icons/${spritePath[key]["gen"]}/${fileName}`] = false
                }
                fileName = baseShinyIcon(spritePath[key]["name"])

                validateStructure[`${root}/${fileName}`] = false; validateStructure[`${root}/back/${fileName}`] = false;
                if(spritePath[key]["female"]){
                    validateStructure[`${root}/female/${fileName}`] = false; validateStructure[`${root}/back/female/${fileName}`] = false
                }
                if(spritePath[key]["exp"]){
                    validateStructure[`${root}/exp/${fileName}`] = false; validateStructure[`${root}/exp/back/${fileName}`] = false
                }
                if(/\/shiny\//.test(key) || /\/icons\/\d+\/\d+s/.test(key)){
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