const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

/* LOGIN CHECK */
const ADMIN_EMAIL = "techsource@gmail.com";

firebase.auth().onAuthStateChanged(function(user){

// agar login nahi hai
if(!user){
window.location.replace("login.html");
return;
}

// agar admin login kare to admin panel bhejo
if(user.email === ADMIN_EMAIL){
window.location.replace("admin.html");
return;
}

// normal user allowed
document.body.style.display = "block";

});


const billForm = document.getElementById('billForm');
billForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value;
    const customerMobile = document.getElementById('customerMobile').value;
    const paymentStatus = document.getElementById('paymentStatus').value;
    const paymentMode = document.getElementById('paymentMode').value;
    let discount = parseFloat(document.getElementById('discountInput').value) || 0;

    const services = [];
    let subtotal = 0;

    document.querySelectorAll('.service').forEach(serviceEl => {
        if(serviceEl.checked){
            const qty = parseInt(serviceEl.parentElement.querySelector('.qty').value) || 1;
            let price = parseFloat(serviceEl.dataset.price || 0);
            let name = serviceEl.dataset.name;

            // Service-specific price selection
            if(serviceEl.classList.contains('casteCheck')){
                const sel = serviceEl.parentElement.querySelector('.casteType');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }
            if(serviceEl.classList.contains('residentialCheck')){
                const sel = serviceEl.parentElement.querySelector('.residentialType');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }
            if(serviceEl.classList.contains('incomeCheck')){
                const sel = serviceEl.parentElement.querySelector('.incomeType');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }
            if(serviceEl.classList.contains('ewsCheck')){
                const sel = serviceEl.parentElement.querySelector('.ewsType');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }
            if(serviceEl.classList.contains('newrationcheck')){
                const sel = serviceEl.parentElement.querySelector('.newrationtype');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }
            if(serviceEl.classList.contains('addmembercheck')){
                const sel = serviceEl.parentElement.querySelector('.addmembertype');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }
            if(serviceEl.classList.contains('removerationcheck')){
                const sel = serviceEl.parentElement.querySelector('.removemembertype');
                price = parseFloat(sel.value);
                name += ` (${sel.options[sel.selectedIndex].text})`;
            }

            services.push({ name, qty, price });
            subtotal += price * qty;
        }
    });

    if(discount > subtotal) discount = subtotal;
    const totalAmount = subtotal - discount;

    const billNo = `TS/${Math.floor(Math.random()*9000+1000)}/${new Date().getFullYear()}`;

    await db.collection('bills').doc().set({
        billNo,
        customerName,
        customerMobile,
        services,
        subtotal,
        discount,
        totalAmount,
        paymentStatus,
        paymentMode,
        date: new Date().toISOString()
    });

    alert(`Bill Generated!\nBill No: ${billNo}\nTotal: ₹${totalAmount}`);
    billForm.reset();
});

function openAdmin() {
    window.open('admin.html', '_blank');
}

function viewBill(id){
    window.open(`billview.html?id=${id}`, '_blank');
}
function logout(){

firebase.auth().signOut().then(()=>{

alert("Logged Out Successfully");

window.location.href="login.html";

});

}