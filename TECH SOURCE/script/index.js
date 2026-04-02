function toggleMenu(){
document.getElementById("navMenu").classList.toggle("active");
}

function toggleServices(){
document.getElementById("servicesDropdown").classList.toggle("active");
}

function toggleDark(){
document.body.classList.toggle("dark");
}

/* Card Animation */

const cards=document.querySelectorAll(".card");

function animateCards(){
cards.forEach(c=>{
if(c.getBoundingClientRect().top < window.innerHeight-100){
c.classList.add("visible");
}
});
}

window.addEventListener("scroll",animateCards);
animateCards();

const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");
const btn = document.getElementById("sendBtn");

form.addEventListener("submit", async function(e){

e.preventDefault();

btn.innerText="Sending...";
btn.disabled=true;

let data=new FormData(form);

try{

let response=await fetch("https://formspree.io/f/xgonwgrr",{
method:"POST",
body:data,
headers:{'Accept':'application/json'}
});

if(response.ok){

status.innerHTML="✅ Message sent successfully!";
status.style.color="green";
form.reset();

}else{

status.innerHTML="❌ Something went wrong!";
status.style.color="red";

}

}catch(error){

status.innerHTML="❌ Network error!";
status.style.color="red";

}

btn.innerText="Send Message";
btn.disabled=false;

});

window.addEventListener("load",function(){

document.getElementById("loader").style.display="none";

});

function openDownloadBill(){
    document.querySelectorAll("section").forEach(sec=>{
        sec.style.display="none";
    });
    document.getElementById("download-bill").style.display="block";
}
// Firebase collection: 'bills'

function downloadBill(){

    const billNo = document.getElementById("downloadBillNo").value.trim().toUpperCase();

    if(!billNo){
        alert("कृपया बिल नंबर डालें");
        return;
    }

    // billview page open
    window.open(`billview.html?billNo=${billNo}`, "_blank");
}
  const billInput = document.getElementById("downloadBillNo");

billInput.addEventListener("input", function(){

    // TS/ hata ke sirf number lo
    let value = billInput.value.replace(/^TS\//i, "").replace(/\D/g, "");

    // max 8 digit
    value = value.substring(0,8);

    let formatted = "TS/";

    if(value.length > 0){
        formatted += value.substring(0,4);
    }

    if(value.length > 4){
        formatted += "/" + value.substring(4,8);
    }

    billInput.value = formatted;
});

       const searchBtn = document.getElementById("search-btn");
    const searchInput = document.getElementById("search");
      function searchYouTube() {
        const query = encodeURIComponent(searchInput.value);

        if (!query) {
            alert("कुछ लिखो पहले!");
            return;
        }

        window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
    }

    searchBtn.addEventListener("click", searchYouTube);

    searchInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            searchYouTube();
        }
    });