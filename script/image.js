const CLOUD_NAME = "dsnuatuc8"
const UPLOAD_PRESET = "ml_default"
const API = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

const drop = document.getElementById("drop")
const fileInput = document.getElementById("file")
const preview = document.getElementById("preview")
const viewer = document.getElementById("viewer")
const viewerImg = document.getElementById("viewerImg")
const historyBox = document.getElementById("historyBox")

drop.onclick = () => fileInput.click()

drop.ondragover = e => e.preventDefault()
drop.ondragenter = () => drop.classList.add("hover")
drop.ondragleave = () => drop.classList.remove("hover")

drop.ondrop = e => {
e.preventDefault()
drop.classList.remove("hover")
handleFiles(e.dataTransfer.files)
}

fileInput.onchange = e => handleFiles(e.target.files)

function handleFiles(files){
for(let file of files){

if(!file.type.startsWith("image/")){
showToast("Only images allowed")
continue
}

if(file.size > 5*1024*1024){
showToast("Max 5MB")
continue
}

let ui = createPreview(file)
upload(file, ui)
}
}

function createPreview(file){
let card = document.createElement("div")
card.className = "card"

let img = document.createElement("img")
img.src = URL.createObjectURL(file)
img.onclick = () => {
viewer.style.display = "flex"
viewerImg.src = img.src
}

let del = document.createElement("div")
del.className = "delete"
del.innerHTML = "×"
del.onclick = () => card.remove()

let progress = document.createElement("div")
progress.className = "progress"

let bar = document.createElement("div")
bar.className = "bar"
progress.appendChild(bar)

let actions = document.createElement("div")
actions.className = "actions"

let copy = document.createElement("button")
copy.textContent = "Copy"

let download = document.createElement("button")
download.textContent = "DL"

actions.appendChild(copy)
actions.appendChild(download)

card.appendChild(img)
card.appendChild(del)
card.appendChild(progress)
card.appendChild(actions)

preview.appendChild(card)

return {card, bar, copy, download}
}

function upload(file, ui){
let form = new FormData()
form.append("file", file)
form.append("upload_preset", UPLOAD_PRESET)

let xhr = new XMLHttpRequest()
xhr.open("POST", API)

xhr.upload.onprogress = e=>{
if(e.lengthComputable){
ui.bar.style.width = (e.loaded/e.total*100)+"%"
}
}

xhr.onload = ()=>{
let res = JSON.parse(xhr.responseText)

if(res.secure_url){
let url = res.secure_url.replace("/upload/","/upload/f_auto,q_auto/")

ui.copy.onclick = ()=>{
navigator.clipboard.writeText(url)
showToast("Copied")
}

ui.download.onclick = ()=>{
window.open(url)
}

saveHistory(url)

}else{
showToast(res.error?.message || "Upload failed")
}
}

xhr.send(form)
}

function saveHistory(url){
let hist = JSON.parse(localStorage.getItem("imgHistory")||"[]")
hist.push(url)
localStorage.setItem("imgHistory",JSON.stringify(hist))
loadHistory()
}

function loadHistory(){
let hist = JSON.parse(localStorage.getItem("imgHistory")||"[]")
historyBox.innerHTML = ""

;[...hist].reverse().forEach(url=>{
let div = document.createElement("div")
let img = document.createElement("img")
img.src = url
img.style.height="50px"

div.appendChild(img)
historyBox.appendChild(div)
})
}

function clearHistory(){
localStorage.removeItem("imgHistory")
loadHistory()
}

function toggleDark(){
document.body.classList.toggle("dark")
}

function showTab(id){
document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"))
document.getElementById(id).classList.add("active")
}

function showToast(msg){
let t=document.createElement("div")
t.className="toast"
t.textContent=msg
document.body.appendChild(t)
setTimeout(()=>t.remove(),2000)
}

loadHistory()
