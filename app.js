const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var fs = require('fs');
var path = require('path');
app.set('view engine', 'ejs');
require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(express.static("public"));

// monggose db
// mongoose.connect('mongodb+srv://admin-shaldan:admin123@cluster0.cpnwcn2.mongodb.net/RanmITSDB');
mongoose.connect(process.env.MONGO_URL)
.then(console.log("DB Connected"))

//multer
var multer = require('multer');

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});
 
var upload = multer({ storage: storage });

//db schema
const lostVehicleSchema = new mongoose.Schema({
    handphoneNumber : Number,
    vType: String,
    vModel: String,
    vYears: Number,
    vColor: String,
    vNumber: String,
    vPhoto: {
        data: Buffer,
        contentType: String
    },
    lostTime: String,
    lostLocation: String,
    description: String,
    userId: String
});

const userSchema = new mongoose.Schema({
    email: String,
    nama: String,
    password: String,
});

// db model
const LostVehicle = new mongoose.model("LostVehicle", lostVehicleSchema);
const User = new mongoose.model("User", userSchema);

// variabel
var existedEmail;
var unmatchedPassword;
var matchedAccount;
var unmatchedAccount;
var id;
var detailedVehicleId;
var query;

// function
function dateFormat(dates){
    let day = dates.toLocaleString('en-us', {weekday: 'long'});
    let date = dates.getDate();
    let month = dates.getMonth();
    let year = dates.getFullYear();
    let formattedDate = day +", "+date+" "+month+" "+year;
    return formattedDate;
}

// login-page
app.get('/', (req,res)=>{
    res.render('loginpage',{navbarTitle: "Login", unmatchedAccount:unmatchedAccount});
    matchedAccount = false;
    unmatchedAccount = false;
    console.log(matchedAccount);
});

app.post('/',(req,res)=>{
    var email = req.body.email.toLowerCase();;
    var password = req.body.password;
    User.find().then((index)=>{
        index.forEach((index)=>{
            if(email == index.email && password == index.password){
                id = index._id.toString();
                matchedAccount = true;
            }
        });
        if(matchedAccount == true){
            res.redirect('/home');

            // homepage
            app.get("/home", (req,res)=>{
                User.findOne({_id: id}).then((user)=>{
                    LostVehicle.find(query).then((index)=>{
                        res.render("homepage",{
                            user: user,
                            lostVehicle: index,
                        });
                    });
                });
            });

            app.post("/home",(req,res)=>{
                var vehicleCategory = req.body.vehicleCategory;
                if(vehicleCategory == "semua"){
                    query = {};
                }else if(vehicleCategory == "motor"){
                    query = {vType: vehicleCategory};
                }else if(vehicleCategory == "mobil"){
                    query = {vType: vehicleCategory};
                }
               
                console.log(query);
                res.redirect('/home');
            });

            // profile-page
            app.get('/profile', (req,res)=>{
                console.log(id);
                User.findOne({_id: id}).then((user)=>{
                    LostVehicle.find({userId: id}).then((index)=>{
                        res.render("profilepage",{
                            user: user,
                            lostVehicle: index,
                        });
                    });
                });
                
            });
            
            // laporan-kehilangan-page
            app.get("/laporan-kehilangan-page", (req,res)=>{
                res.render('laporan-kehilangan-page',{navbarTitle: "Lapor Kehilangan"});
            });

            app.post("/laporan-kehilangan-page", upload.single('vPhoto'),(req,res)=>{
                const selectedDate = new Date(req.body.lostTime);
                const formattedDate = selectedDate.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }).toString();;

                const lostVehicle = new LostVehicle({
                    handphoneNumber : req.body.handphoneNumber,
                    vType: req.body.vType,
                    vModel: req.body.vModel,
                    vYears: req.body.vYears,
                    vColor: req.body.vColor,
                    vNumber: req.body.vNumber,
                    vPhoto: {
                        data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                        contentType: 'image/png'
                    },
                    lostTime: formattedDate,
                    lostLocation: req.body.lostLocation,
                    description: req.body.description,
                    userId: id
                });
                lostVehicle.save().then(()=>{
                    res.redirect('/success');
                });
            });

            //tentang-produk-page
            app.get("/tentang-produk-page", (req,res)=>{
                User.findOne({_id: id}).then((index)=>{
                    res.render("tentang-produk-page",{user: index});
                });
            });

            // success page for uploading lost vehicle document
            app.get('/success',(req,res)=>{
                res.render("successpage");
            });

            // delete lost vehicle data from profile page
            app.post('/deleteLostVehicle',(req,res)=>{
                var deletedId = req.body.delete;
                LostVehicle.findOneAndDelete({_id: deletedId}).then((index)=>{
                    console.log("id: "+deletedId+" has been deleted");
                    res.redirect('/profile')
                });
            });

            // lost vehicle detial page
            app.get("/detail",(req,res)=>{
                LostVehicle.findOne({_id: detailedVehicleId}).then((index)=>{
                    res.render('detailpage',{index: index, navbarTitle: "Detail Laporan"});
                });
               
            });

            app.post('/detailedVehicleId',(req,res)=>{
                detailedVehicleId = req.body.detailedVehicleId;
                res.redirect('/detail')
            });

        }else{
           unmatchedAccount = true;
           res.redirect('/');
        }
    });
});

// register-page
app.get('/register', (req,res)=>{
    res.render('registerpage',{navbarTitle: "Buat akun", existedEmail: existedEmail, unmatchedPassword: unmatchedPassword});
    existedEmail = false;
    unmatchedPassword = false;
});

app.post('/register', async (req,res)=> { 
    var email = req.body.email.toLowerCase();
    var nama = req.body.nama;
    var password = req.body.password;
    var passwordConfirmation = req.body.passwordConfirmation;

    if(password == passwordConfirmation){
        await User.find().then((index)=>{
            index.forEach((index) => {
                if(index.email == email){
                    existedEmail = true;
                }
            });
        });
        
        if(existedEmail == false){
            const user = new User({
                email: email,
                nama: nama,
                password: password,
            });
            user.save();
            res.redirect('/');
        }else{
            res.redirect('/register');
        }
    }else{
        unmatchedPassword = true;
    }
});

app.listen(3000,()=>{
    console.log("Running app on port 3000");
});