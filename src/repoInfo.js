window.repo = "pagefaultgames/pokerogue/main"

async function returnSpritePathInfo(spritePath){
    const spritePathToIcon = await returnSpritePathToIcon(spritePath)
    spritePath = await getSpritePathInfo(spritePathToIcon, spritePath)
    Object.keys(spritePath).forEach(key => {
        const genRegex = new RegExp(`icons\/(?:variant\/)?${spritePath[key]["gen"]}\/`)
        if(!spritePath[key]["gen"] && /icons\//.test(key)){
            report("warning", `Couldn't find generation for: ${replaceRoot(key)}`)
            spritePath[key]["ignore"] = true
        }
        else if(spritePath[key]["gen"] && /icons\//.test(key) && !genRegex.test(key)){
            report("error", `Incorrect generation for: ${replaceRoot(key)}`)
            spritePath[key]["ignore"] = true
        }
    })
    return spritePath
}

async function returnSpritePathToIcon(spritePath){
    const rawIcons = await fetch(`https://raw.githubusercontent.com/${repo}/public/images/pokemon/icons/icons.ps1`)
    const textIcons = await rawIcons.text()

    let spritePathToIcon = {}

    Object.keys(spritePath).forEach(key => {
        const name = spritePath[key]["name"]
        let iconName = textIcons.match(new RegExp(`\\W+(.*?)\\W\\s*=\\s*\\W${baseSpritePath(name, key)}\\W`))
        if(iconName){
            spritePathToIcon[name] = iconName[1]
        }
        else{
            const nameInt = name.match(/^\d+/)
            if(nameInt){
                iconName = textIcons.match(new RegExp(`\\W+(.*?)\\W\\s*=\\s*\\W${nameInt[0]}\\W`))
                if(iconName){
                    spritePathToIcon[name] = iconName[1]
                }
            }
        }
    })

    return spritePathToIcon
}

async function getSpritePathInfo(spritePathToIcon, spritePath){
    const rawExpSprites= await fetch(`https://raw.githubusercontent.com/${repo}/public/exp-sprites.json`)
    const jsonExpSprites = await rawExpSprites.json()

    for(const key of Object.keys(spritePath)){
        spritePath[key]["female"] = false
        spritePath[key]["gen"] = null
        spritePath[key]["exp"] = false

        if(jsonExpSprites.includes(spritePath[key]["name"].replace(/(?:_(?:1|2|3))?\.png$/, ""))){
            spritePath[key]["exp"] = true
        }
        /*
        try{
            const rawJson = await fetch(`https://raw.githubusercontent.com/${repo}/public/images/pokemon/${baseSpritePath(spritePath[key]["name"], key)}.json`)
            const json = await rawJson.json()
    
            if("textures" in json){
                if(json["textures"][0]["frames"].length == 1 && !/gigantamax/.test(spritePath[key]["name"])){
                    spritePath[key]["exp"] = true
                }
            }
            else{
                if(json["frames"].length == 1 && !/gigantamax/.test(spritePath[key]["name"])){
                    spritePath[key]["exp"] = true
                }
            }
        }
        catch{
            report("error", `Most likely incorrect file name: ${replaceRoot(key)}`)
            spritePath[key]["ignore"] = true
        }
        */
    }

    const rawPokemonSpecies= await fetch(`https://raw.githubusercontent.com/${repo}/src/data/pokemon-species.ts`)
    const textPokemonSpecies = await rawPokemonSpecies.text()

    const textPokemonSpeciesMatch = textPokemonSpecies.match(/new\s*PokemonSpecies\(Species\..*?(?=new\s*PokemonSpecies|;)/igs)
    if(textPokemonSpeciesMatch){
        textPokemonSpeciesMatch.forEach(initSpeciesMatch => {
            let originalSpecies = null
            let speciesInitArray = initSpeciesMatch.match(/new\s*PokemonForm\(.*?\)/igs)
            if(speciesInitArray){
                speciesInitArray.forEach(formString => {
                    initSpeciesMatch = initSpeciesMatch.replace(formString, "")
                })
                speciesInitArray.unshift(initSpeciesMatch)
            }
            else{
                speciesInitArray = [initSpeciesMatch]
            }

            speciesInitArray.forEach(speciesInit => {
                let speciesName = null
                const speciesNameMatch = speciesInit.match(/Species\.\w+/i)
                if(speciesNameMatch){
                    originalSpecies = speciesNameMatch[0].replace(/Species\./i, "").replaceAll("_", "-").toLowerCase()
                    speciesName = originalSpecies
                }
                else{
                    let extraNameMatch = speciesInit.match(/".*?"\s*,\s*"(.*?)"/)
                    if(extraNameMatch && typeof extraNameMatch[1] === "string"){
                        if(extraNameMatch[1] === ""){
                            speciesName = originalSpecies
                        }
                        else{
                            speciesName = `${originalSpecies}-${extraNameMatch[1].replaceAll(/_|\.| /g, "-").toLowerCase()}`
                        }
                    }
                    else{
                        extraNameMatch = speciesInit.match(/SpeciesFormKey.\w+/i)
                        if(extraNameMatch){
                            speciesName = `${originalSpecies}${extraNameMatch[0].replace("SpeciesFormKey.", "-").toLowerCase()}`
                        }
                    }
                }
                
                if(speciesName){
                    const regionMatch = speciesName.match(/(ALOLA|GALAR|HISUI|PALDEA)-/i)
                    if(regionMatch){
                        speciesName = `${speciesName.replace(`${regionMatch[0]}`, "")}-${regionMatch[1].replace(/\-$/, "")}`
                    }

                    if(Object.values(spritePathToIcon).includes(speciesName)){
                        const iconKeys = Object.keys(spritePathToIcon).filter(key => spritePathToIcon[key] === speciesName)
                        let gen = initSpeciesMatch.match(/Species\.\w+\s*,\s*(\d+)/i)
                        const femaleMatch = speciesInit.match(/\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+.*?(false|true)/i)

                        iconKeys.forEach(iconKey => {
                            const spritePathKeys = Object.keys(spritePath).filter(path => spritePath[path]["name"] === iconKey)
                            spritePathKeys.forEach(spritePathKey => {
                                if(gen){
                                    spritePath[spritePathKey]["gen"] = gen[1]
                                }
    
                                if(femaleMatch){
                                    if(femaleMatch[1].toLowerCase() == "true" && !/-mega$|-gigantamax$/i.test(speciesName)){
                                        spritePath[spritePathKey]["female"] = true
                                    }
                                }
                            })
                        })
                    }
                }
            })
        })
    }

    return spritePath
}