const API="https://api.imgbb.com/1/upload?key=fa4ad05090c8cc3f9ade673a64a52235"
const drop=document.getElementById("drop")
const fileInput=document.getElementById("file")
const preview=document.getElementById("preview")
const historyBox=document.getElementById("historyBox")

drop.onclick=()=>fileInput.click()
drop.ondragover=e=>{e.preventDefault()}
drop.ondrop=e=>{e.preventDefault();handleFiles(e.dataTransfer.files)}
fileInput.onchange=e=>handleFiles(e.target.files)

function handleFiles(files){
for(let file of files){
compress(file).then(f=>{
createPreview(f)
upload(f)
})
}
}

function createPreview(file){
let card=document.createElement("div")
card.className="card"
card.draggable=true

let img=document.createElement("img")
img.src=URL.createObjectURL(file)

let del=document.createElement("div")
del.className="delete"
del.innerHTML="×"
del.onclick=()=>card.remove()

let progress=document.createElement("div")
progress.className="progress"
let bar=document.createElement("div")
bar.className="bar"
progress.appendChild(bar)

let linkBox=document.createElement("div")
linkBox.className="link-box"
let input=document.createElement("input")
input.type="text"
input.readOnly=true
let copyBtn=document.createElement("button")
copyBtn.textContent="Copy"
copyBtn.onclick=()=>{input.select();document.execCommand("copy");alert("Link Copied!")}

linkBox.appendChild(input)
linkBox.appendChild(copyBtn)

card.appendChild(img)
card.appendChild(del)
card.appendChild(progress)
card.appendChild(linkBox)
preview.appendChild(card)
}

function upload(file){
let form=new FormData()
form.append("image",file)
let xhr=new XMLHttpRequest()
xhr.open("POST",API)
xhr.upload.onprogress=e=>{
if(e.lengthComputable){
let percent=(e.loaded/e.total)*100
let bars=document.querySelectorAll(".bar")
bars[bars.length-1].style.width=percent+"%"
}
}
xhr.onload=()=>{
let res=JSON.parse(xhr.responseText)
let url=res.data.url
// set link in preview
let lastInput=document.querySelectorAll(".link-box input")
lastInput[lastInput.length-1].value=url
saveHistory(url)
}
xhr.send(form)
}

function compress(file){
return new Promise(resolve=>{
let img=new Image()
let reader=new FileReader()
reader.onload=e=>img.src=e.target.result
img.onload=()=>{
let canvas=document.createElement("canvas")
let ctx=canvas.getContext("2d")
let max=800
let w=img.width
let h=img.height
if(w>max){h=h*(max/w);w=max}
canvas.width=w
canvas.height=h
ctx.drawImage(img,0,0,w,h)
canvas.toBlob(blob=>{
resolve(new File([blob],file.name,{type:"image/jpeg"}))
},"image/jpeg",0.7)
}
reader.readAsDataURL(file)
})
}

function toggleDark(){document.body.classList.toggle("dark")}

// Tabs
function showTab(id){
document.querySelectorAll(".tab").forEach(tab=>tab.classList.remove("active"))
document.getElementById(id).classList.add("active")
}

// Upload History
function saveHistory(url){
let hist=JSON.parse(localStorage.getItem("imgHistory")||"[]")
hist.push(url)
localStorage.setItem("imgHistory",JSON.stringify(hist))
loadHistory()
}

function loadHistory(){
let hist=JSON.parse(localStorage.getItem("imgHistory")||"[]")
historyBox.innerHTML=""
hist.reverse().forEach(url=>{
let div=document.createElement("div")
div.style.marginBottom="10px"
let img=document.createElement("img")
img.src=url
img.style.verticalAlign="middle"
let input=document.createElement("input")
input.type="text"
input.value=url
input.readOnly=true
input.style.width="60%"
let copyBtn=document.createElement("button")
copyBtn.textContent="Copy"
copyBtn.onclick=()=>{input.select();document.execCommand("copy");alert("Link Copied!")}

div.appendChild(img)
div.appendChild(input)
div.appendChild(copyBtn)
historyBox.appendChild(div)
})
}

loadHistory()