// ===============================
// MENU
// ===============================
function toggleMenu(){
  document.getElementById("navMenu").classList.toggle("active");
}

function toggleServices(){
  document.getElementById("servicesDropdown").classList.toggle("active");
}

function toggleDark(){
  document.body.classList.toggle("dark");
}


// ===============================
// CARD ANIMATION (SMOOTH + ONCE)
// ===============================
const cards = document.querySelectorAll(".card");

function animateCards(){
  cards.forEach((card, index) => {

    if(card.classList.contains("show")) return; // already animated

    if(card.getBoundingClientRect().top < window.innerHeight - 80){

      setTimeout(() => {
        card.classList.add("show");
      }, index * 120);

    }

  });
}

window.addEventListener("scroll", animateCards);
window.addEventListener("load", animateCards);


// ===============================
// CONTACT FORM (FIXED)
// ===============================
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const sendBtn = document.getElementById("sendBtn");

if (contactForm) {
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    sendBtn.innerText = "Sending...";
    sendBtn.disabled = true;

    let data = new FormData(contactForm);

    try {
      let response = await fetch("https://formspree.io/f/xgonwgrr", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      });

      if (response.ok) {
        formStatus.innerHTML = "✅ Message sent successfully!";
        formStatus.style.color = "green";
        contactForm.reset();
      } else {
        formStatus.innerHTML = "❌ Something went wrong!";
        formStatus.style.color = "red";
      }

    } catch (error) {
      formStatus.innerHTML = "❌ Network error!";
      formStatus.style.color = "red";
    }

    sendBtn.innerText = "Send Message";
    sendBtn.disabled = false;
  });
}

// ===============================
// LOADER
// ===============================
window.addEventListener("load", function(){
  const loader = document.getElementById("loader");
  if(loader){
    loader.style.opacity = "0";
    setTimeout(()=> loader.style.display="none", 400);
  }
});


// ===============================
// DOWNLOAD BILL SECTION
// ===============================
function openDownloadBill(){
  document.querySelectorAll("section").forEach(sec=>{
    sec.style.display="none";
  });

  document.getElementById("download-bill").style.display="block";

  // smooth scroll
  window.scrollTo({top:0, behavior:"smooth"});
}


// ===============================
// DOWNLOAD BILL FUNCTION
// ===============================
function downloadBill(){

  const input = document.getElementById("downloadBillNo");
  if(!input) return;

  const billNo = input.value.trim().toUpperCase();

  if(!billNo){
    alert("कृपया बिल नंबर डालें");
    return;
  }

  window.open(`billview.html?billNo=${billNo}`, "_blank");
}


// ===============================
// BILL INPUT FORMAT
// ===============================
const billInput = document.getElementById("downloadBillNo");

if(billInput){
billInput.addEventListener("input", function(){

  let value = billInput.value
    .replace(/^TS\//i, "")
    .replace(/\D/g, "")
    .substring(0,8);

  let formatted = "TS/";

  if(value.length > 0){
    formatted += value.substring(0,4);
  }

  if(value.length > 4){
    formatted += "/" + value.substring(4,8);
  }

  billInput.value = formatted;
});
}
