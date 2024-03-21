/*  EXPRESS */
const express = require('express');

const session = require('express-session');

const {authenticator} = require("otplib");
const qrcode = require("qrcode");
const app = express();

app.set('view engine', 'ejs');

app.use(session({
  
  resave: false,
  saveUninitialized: false,
  secret: 'SECRET' 
}));
 app.use(express.urlencoded({extended : false}));

app.get('/', function(req, res) {
     
      res.render('pages/auth'); // render page auth
});

const port = process.env.PORT || 3000; // set default PORT
app.listen(port , () => console.log('App listening on port ' + port)); 


var passport = require('passport');
var userProfile;
 
app.use(passport.initialize());
app.use(passport.session());
 
app.get('/success', (req, res) => {

  res.render('pages/success', {user: userProfile});
});
app.get('/error', (req, res) => res.send("error logging in"));
 
passport.serializeUser(function(user, cb) {
  cb(null, user);
});
 
passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// /*  Google AUTH  */
 
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID =  'GOOGLE_CLIENT_ID' ; // edit your GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET' ; // edit your GOOGLE_CLIENT_SECRET

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));
 
app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  async function(req, res) {
    // Successful authentication, redirect success.

    const secret = generateSecret();
    const qrCode = await generateQRCode(secret) // Generate QR code

    res.render("pages/qrcode",{secret,qrCode}); // verify 2fa qrcode
    //res.redirect('/success');
  });

 // route for logging out
 app.get('/logout', (req, res,next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.clearCookie('connect.sid');  // clear the session cookie
    req.logout(function(err) {  // logout of passport
      req.session.destroy(function (err) { // destroy the session
        res.redirect('/');
      });
    });
    
  });
});


/*QR Code*/

// gen secret key for user
const generateSecret = () => authenticator.generateSecret();

//Gen OTP for user
const generateOTP = secret => authenticator.generate(secret);

//verify OTP entered user
const verifyOTP = (secret,token) =>authenticator.verify({secret,token});

//Gen QR code for authenticator 
const generateQRCode = async secret => {
  const otpauthURL = authenticator.keyuri("user@example.com", "MyApp",secret);
  try{
    const qrItem = await qrcode.toDataURL(otpauthURL);
    return qrItem;
  } catch(error){
    console.error("Error generateing QR code:",error);
    return null;
  }
};

// app.get("/",async(req,res) =>{
//   console.log(0)
//    const secret = generateSecret();
//    const qrCode = await generateQRCode(secret) // Generate QR code
//    console.log(qrCode);
//    res.render("pages/qrcode",{secret,qrCode});
// })

app.post("/verify",(req,res) => {
   const {secret,token} = req.body;
   const isValid = verifyOTP(secret,token);
   res.render("pages/success",{isValid,user: userProfile});
})

