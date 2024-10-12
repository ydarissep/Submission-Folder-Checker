const dirPicker = document.getElementById("dirPicker")
const reportEl = document.getElementById("reportEl")

dirPicker.addEventListener("change",async (event) => {
    reportEl.innerHTML = ""
    dirPicker.classList.add("reduce")
    
    const files = []

    if(event.target.files.length > 50000){
        report("error", "Too many files!")
        return
    }

    for(const file of event.target.files) {
        if(file){
            files.push(file)
        }
    }

    if(files.length > 0){
        await checkRootFolder(files)
    }
    else{
        report("error", "Couldn't find any file.")
    }
}, false)

function replaceRoot(path){
    const root = path.split("/")[0]
    if(root == "back" || root == "exp" || root == "female" || root == "icons" || root == "shiny"){
        return path
    }
    else{
        return path.replace(/.*?\//, "\*/")
    }
}

function baseSpritePath(name, path = null){
    if(path && /icons\//.test(path)){
        name = baseShinyIcon(name)
    }
    return name.replace(/(?:_1|_2|_3)?\.png$/, "")
}

function baseShinyIcon(name){
    const sMatch = name.match(/((\d+)s?(?:-?f)?).*?\.png/)
    if(sMatch){
        return name.replace(sMatch[1], sMatch[2])
    }

    return name
}

function createList(listTitle){
    const list = document.createElement("ul"); list.innerText = listTitle; reportEl.append(list)
}

function report(status, text = null){
    const lastReportElIndex = reportEl.children.length - 1
    if(lastReportElIndex >= 0){
        if(text){
            const listItem = document.createElement("li"); listItem.classList.add(status); listItem.innerText = text; reportEl.children[lastReportElIndex].append(listItem)
            if(status == "error" || status == "warning"){
                report(status)
            }
        }
        else{
            if(status == "error" || (status == "warning" && !reportEl.children[lastReportElIndex].classList.contains("error")) || reportEl.children[lastReportElIndex].classList.length == 0){
                reportEl.children[lastReportElIndex].classList = status
            }
        }
    }
    else if(text){
        const p = document.createElement("p"); p.innerText = text; p.classList.add(status); reportEl.append(p)
    }
}