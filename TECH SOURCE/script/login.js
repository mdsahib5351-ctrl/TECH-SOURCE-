
// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDZ-NvSzXJrH8YyvI5GWVWRtZnSNe0NAxU",
  authDomain: "tech-source-bill.firebaseapp.com",
  databaseURL: "https://tech-source-bill-default-rtdb.firebaseio.com",
  projectId: "tech-source-bill",
  storageBucket: "tech-source-bill.firebasestorage.app",
  messagingSenderId: "690209240188",
  appId: "1:690209240188:web:6e54de365e7f839634c5f9"
};

// FIREBASE START
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();


// UI SWITCH LOGIN / SIGNUP
const authWrapper = document.querySelector('.auth-wrapper');
const loginTrigger = document.querySelector('.login-trigger');
const registerTrigger = document.querySelector('.register-trigger');

registerTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    authWrapper.classList.add('toggled');
});

loginTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    authWrapper.classList.remove('toggled');
});


// ================= LOGIN =================
document.querySelector(".credentials-panel.signin form")
.addEventListener("submit", function(e){

e.preventDefault();

let email = document.getElementById("loginEmail").value;
let password = document.getElementById("loginPassword").value;

auth.signInWithEmailAndPassword(email, password)
.then((userCredential)=>{

const user = userCredential.user;

// ADMIN EMAIL
const ADMIN_EMAIL = "techsource@gmail.com";

// EMAIL CHECK
if(user.email === ADMIN_EMAIL){

// ADMIN PANEL
window.location.href = "admin.html";

}else{

// USER PANEL
window.location.href = "generatebill.html";

}

})
.catch((error)=>{
alert(error.message);
});

});


// ================= SIGNUP =================
document.querySelector(".credentials-panel.signup form")
.addEventListener("submit", function(e){

e.preventDefault();

let username = document.getElementById("registerUsername").value;
let email = document.getElementById("registerEmail").value;
let password = document.getElementById("registerPassword").value;

auth.createUserWithEmailAndPassword(email, password)
.then((userCredential)=>{

return userCredential.user.updateProfile({
displayName: username
});

})
.then(()=>{

alert("Account Created Successfully");
authWrapper.classList.remove('toggled');

})
.catch((error)=>{
alert(error.message);
});

});
