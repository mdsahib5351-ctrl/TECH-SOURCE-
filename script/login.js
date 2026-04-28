
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
const db = firebase.firestore();
const ADMIN_EMAIL = "techsource@gmail.com";

function getRedirectTarget(){
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if(next && /^[a-zA-Z0-9_-]+\.html(?:[?#].*)?$/.test(next)){
    return next;
  }
  return "index.html";
}

async function ensureUserProfile(user, extra = {}){
  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();
  const baseProfile = {
    name: extra.name || user.displayName || user.email.split("@")[0],
    email: user.email,
    phone: extra.phone || "",
    mobile: extra.phone || "",
    city: "",
    address: "",
    photoUrl: user.photoURL || "",
    updatedAt: new Date()
  };

  if(snap.exists){
    await ref.set({
      email: user.email,
      name: snap.data().name || baseProfile.name,
      phone: snap.data().phone || snap.data().mobile || baseProfile.phone,
      mobile: snap.data().mobile || snap.data().phone || baseProfile.mobile,
      photoUrl: snap.data().photoUrl || baseProfile.photoUrl,
      updatedAt: new Date()
    }, { merge:true });
  }else{
    await ref.set({
      ...baseProfile,
      createdAt: new Date()
    }, { merge:true });
  }
}


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
.then(async (userCredential)=>{

const user = userCredential.user;
await ensureUserProfile(user);

// EMAIL CHECK
if(user.email === ADMIN_EMAIL){

// ADMIN PANEL
window.location.href = "admin.html";

}else{

// USER PANEL
window.location.href = getRedirectTarget();

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
let mobile = document.getElementById("registerMobile").value.replace(/\D/g, "");
let email = document.getElementById("registerEmail").value;
let password = document.getElementById("registerPassword").value;

if(mobile.length !== 10){
alert("Valid 10 digit mobile number enter karein");
return;
}

auth.createUserWithEmailAndPassword(email, password)
.then(async (userCredential)=>{

await userCredential.user.updateProfile({
displayName: username
});
await ensureUserProfile(userCredential.user, { name: username, phone: mobile });

})
.then(()=>{

alert("Account Created Successfully");
authWrapper.classList.remove('toggled');

})
.catch((error)=>{
alert(error.message);
});

});
