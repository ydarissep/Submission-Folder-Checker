window.repo = "pagefaultgames/pokerogue/main"

async function returnSpritePathInfo(spritePath){
    const spritePathToSpeciesID = await returnSpritePathToSpeciesID(spritePath)
    spritePath = await getSpritePathInfo(spritePathToSpeciesID, spritePath)
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

async function returnSpritePathToSpeciesID(spritePath){
    const rawSpeciesID = await fetch(`https://raw.githubusercontent.com/${repo}/src/enums/species.ts`)
    const textSpeciesID = await rawSpeciesID.text()

    let spritePathToSpeciesID = {}
    let ID = 0
    const speciesEnumMatch = textSpeciesID.match(/^\s*\w+\s*(?:\=\s*\d+\s*)?,?$/gm)
    if(speciesEnumMatch){
        speciesEnumMatch.forEach(speciesID => {
            const speciesName = speciesID.match(/\w+/)[0].replaceAll(/_|\.| /g, "-").toLowerCase()
            const idMatch = speciesID.match(/\=\s*(\d+)/)
            if(idMatch){
                ID = parseInt(idMatch[1])
            }
            else{
                ID++
            }
            spritePathToSpeciesID[speciesName] = ID
        })
    }

    return spritePathToSpeciesID
}

async function getSpritePathInfo(spritePathToSpeciesID, spritePath){
    const rawExpSprites= await fetch(`https://raw.githubusercontent.com/${repo}/public/exp-sprites.json`)
    const jsonExpSprites = await rawExpSprites.json()

    let validName = []
    for(let i = 1; i <= 9; i++){
        const rawPokemonIcons = await fetch(`https://raw.githubusercontent.com/${repo}/public/images/pokemon_icons_${i}.json`)
        const jsonPokemonIcons = await rawPokemonIcons.json()

        for(let j = 0; j < jsonPokemonIcons["textures"][0]["frames"].length; j++){
            validName.push(jsonPokemonIcons["textures"][0]["frames"][j]["filename"])
        }
    }

    for(const key of Object.keys(spritePath)){
        spritePath[key]["female"] = false
        spritePath[key]["gen"] = null
        spritePath[key]["exp"] = false

        const spritePathName = spritePath[key]["name"].replace(/(?:_(?:1|2|3))?\.png$/, "")
        if(jsonExpSprites.includes(spritePathName)){
            spritePath[key]["exp"] = true
        }
        if(!validName.includes(spritePathName)){
            report("error", `Incorrect file name: ${replaceRoot(key)}`)
            spritePath[key]["ignore"] = true
        }
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
                    const OriginalIconKey = spritePathToSpeciesID[originalSpecies]
                    if(OriginalIconKey){
                        const iconKey = speciesName.replace(originalSpecies, OriginalIconKey)
                        if(validName.includes(iconKey)){
                            let gen = initSpeciesMatch.match(/Species\.\w+\s*,\s*(\d+)/i)
                            const femaleMatch = speciesInit.match(/\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+.*?(false|true)/i)

                            const spritePathKeys = Object.keys(spritePath).filter(path => baseSpritePath(spritePath[path]["name"], path) === iconKey)
                            spritePathKeys.forEach(spritePathKey => {
                                if(gen){
                                    spritePath[spritePathKey]["gen"] = gen[1]
                                }

                                if(femaleMatch){
                                    if(femaleMatch[1].toLowerCase() == "true" && !/-mega$|-gigantamax$/i.test(iconKey)){
                                        spritePath[spritePathKey]["female"] = true
                                    }
                                }
                            })
                        }
                    }
                }
            })
        })
    }

    return spritePath
}