async function checkSprites(files, spritePath){
    createList(`Sprites data`)

    for(let i = 0; i < files.length; i++){
        const path = files[i].webkitRelativePath

        if(path in spritePath && !spritePath[path]["ignore"]){
            const readerDataURL = new FileReader()

            readerDataURL.addEventListener("load", async () => {
                await checkSprite(path, readerDataURL.result, spritePath[path], await returnBaseFixFile(files, path), files.length > 1000 ? i : 0)
            }, false)


            readerDataURL.readAsDataURL(files[i])




            if(!/icons\//.test(path) && !/_(?:1|2|3)\.png$/.test(path)){
                const readArrayBuffer = new FileReader()

                readArrayBuffer.addEventListener("load", async () => {
                    //console.log(new Int8Array(readArrayBuffer.result)[24]) // Bit depth
                    if(new Int8Array(readArrayBuffer.result)[25] != 3){ // Color type, indexed = 3 else should be 6
                        report("warning", `File isn't indexed: ${replaceRoot(path)}`)
                    }
                }, false)

                readArrayBuffer.readAsArrayBuffer(files[i])
            }
        }
    }

    report("valid")
}

async function returnBaseFixFile(files, path){
    if(/_(?:1|2|3)\.png$|shiny\//.test(path)){
        const baseFixFile = files.find((file) => file.webkitRelativePath == path.replace(/_(?:1|2|3)/, "").replace(/variant\/|shiny\//, ""))
        if(baseFixFile){
            return baseFixFile
        }
    }
    else{
        return null
    }
}

async function checkSprite(path, spriteDataURL, spritePathInfo, baseFixFile, delayTimer){
    setTimeout(function() {
        let sprite = new Image()
        sprite.src = spriteDataURL
    
        sprite.onload = async () => {
            let repoSprite = new Image()
            if(baseFixFile){
                const readerDataURL = new FileReader()
                readerDataURL.addEventListener("load", async () => {
                    repoSprite.src = readerDataURL.result
                }, false)
                readerDataURL.readAsDataURL(baseFixFile)
            }
            else{
                try{
                    repoSprite.crossOrigin = 'anonymous'
                    repoSprite.src = returnSpriteURL(spritePathInfo["name"], path, spritePathInfo["gen"])
                }
                catch{
                    report("error", `Couldn't fetch: ${returnSpriteURL(spritePathInfo["name"], path, spritePathInfo["gen"])}`)
                }
            }
    
            repoSprite.onload = async () => {
                if(/icons\//.test(path)){
                    if(sprite.width != 40 || sprite.height != 30){
                        report("error", `Icon isn't 40x30, got: ${sprite.width}x${sprite.height}: ${replaceRoot(path)}`)
                    }
                }
                else if(repoSprite.width != sprite.width || repoSprite.height != sprite.height){
                    report("error", `Incorrect image size, got: ${sprite.width}x${sprite.height}, expected: ${repoSprite.width}x${repoSprite.height}: ${replaceRoot(path)}`)
                }
    
                let canvas = document.createElement("canvas")
                let repoCanvas = document.createElement("canvas")
                canvas.width = sprite.width
                canvas.height = sprite.height
                repoCanvas.width = repoSprite.width
                repoCanvas.height = repoSprite.height
    
                const context = canvas.getContext('2d')
                const repoContext = repoCanvas.getContext('2d')
    
                context.clearRect(0, 0, canvas.width, canvas.height)
                context.drawImage(sprite, 0, 0)
                repoContext.clearRect(0, 0, repoCanvas.width, repoCanvas.height)
                repoContext.drawImage(repoSprite, 0, 0)
    
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
                const repoImageData = repoContext.getImageData(0, 0, repoCanvas.width, repoCanvas.height)
    
                let pal = [], repoPal = [], checkBackgroundChange = true, checkPixelAlpha = true
                for(let i = 0; i < imageData.data.length; i += 4){
                    if(!pal.includes(`${imageData.data[i]},${imageData.data[i + 1]},${imageData.data[i + 2]},${imageData.data[i + 3]}`)){
                        pal.push(`${imageData.data[i]},${imageData.data[i + 1]},${imageData.data[i + 2]},${imageData.data[i + 3]}`)
                    }
                    if(!repoPal.includes(`${repoImageData.data[i]},${repoImageData.data[i + 1]},${repoImageData.data[i + 2]},${repoImageData.data[i + 3]}`)){
                        repoPal.push(`${repoImageData.data[i]},${repoImageData.data[i + 1]},${repoImageData.data[i + 2]},${repoImageData.data[i + 3]}`)
                    }
    
                    if(checkBackgroundChange && ((imageData.data[i + 3] === 0 && repoImageData.data[i + 3] !== 0) || (imageData.data[i + 3] !== 0 && repoImageData.data[i + 3] === 0))){
                        report("error", `Transparent background change at ${parseInt((i / 4) % sprite.width)}x${parseInt((i / 4) / sprite.width)}: ${replaceRoot(path)}`)
                        checkBackgroundChange = false
                    }
                    if(checkPixelAlpha && imageData.data[i + 3] !== 0 && imageData.data[i + 3] !== 255){
                        report("error", `Pixel at ${parseInt((i / 4) % sprite.width)}x${parseInt((i / 4) / sprite.width)} is alpha ${imageData.data[i + 3]}: ${replaceRoot(path)}`)
                        checkPixelAlpha = false
                    }
                }
    
                if(pal.length > 32){
                    report("error", `Palette count above 32 (${pal.length}): ${replaceRoot(path)}`)
                }
    
                if(/_(?:1|2|3)\.png$/.test(path) && !/icons\//.test(path)){
                    if(pal.length < repoPal.length){
                        report("valid", `Palette count change, got: ${pal.length}, expected: ${repoPal.length} (this can be ignored): ${replaceRoot(path)}`)
                    }
                    else if(pal.length > repoPal.length){
                        if(baseFixFile){
                            report("error", `Palette count change, got: ${pal.length}, expected: ${repoPal.length} (incorrect base fix): ${replaceRoot(path)}`)
                        }
                        else{
                            report("error", `Palette count change, got: ${pal.length}, expected: ${repoPal.length}: ${replaceRoot(path)}`)
                        }
                    }
                }
            }
        }
    }, 10 * delayTimer)
}










function returnSpriteURL(name, path, gen = null){
    let url = `https://raw.githubusercontent.com/${repo}/public/images/pokemon/`
    if(/icons\/(?:variant\/)?\d+\//.test(path) && gen){
        url += `icons/${gen}/`
    }
    if(/exp\//.test(path)){
        url += "exp/"
    }
    if(/back\//.test(path)){
        url += "back/"
    }
    if(/female\//.test(path)){
        url += "female/"
    }
    url += name.replace(/_(?:1|2|3)\.png$/, ".png")

    //console.log(url, path)
    return url
}