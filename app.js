// Dwsktop/My-Shop
const express = require("express");
const path = require("path");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const multer = require("multer");
const fs = require("fs");
const request = require("request");
const sendMail = require("./mail");

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));

// using passport for password security, to generate hash and salt for the user.
app.use(passport.initialize());
app.use(passport.session());

// Mongo connection
mongoose.connect('mongodb+srv://admin-vicky:Test654@cluster0.rmfg4.mongodb.net/MyShopDB?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

// Schema model for the photos uploads
const uploadSchema = new mongoose.Schema({
  filename: {
    type: String,
    unique: true,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  imageBase64: {
    type: String,
    required: true
  },
  title: String,
  genre: String,
  author: String,
  price: Number,
  amount: Number
});
const Uploads = mongoose.model('Uploads', uploadSchema);

// Schema model for users
const userSchema = new mongoose.Schema ({
  name: String,
  username: String,
  password: String,
  photos: [mongoose.ObjectId],
  cartItems: Number
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Schema model for the items in cart
const cartSchema = new mongoose.Schema({
  userID: mongoose.ObjectId,
  productID: mongoose.ObjectId
});
const Cart = mongoose.model('Cart', cartSchema);

// Create storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    //image.jpg
    const ext = file.originalname.substr(file.originalname.lastIndexOf('.'));
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      cb(null, file.fieldname + '-' + Date.now() + ext);
    } else {
      cb("Error: Images Only!");
    }
  }
});

// Init upload
const upload = multer({
  storage: storage
});


// @route GET /
// @desc Loads form
app.get("/", function(req, res){
  Uploads.find({}, function(err, foundUploads) {
    if (err) {
      console.log(err);
    } else {
      if (foundUploads) {
        res.render("home", {images: foundUploads, user: req.user});
      } else {
        res.render("home", {user: req.user});
      }
    }
  });
});

app.get("/contact", function(req, res) {
  res.render("contact", {user: req.user});
});

// @desc Account uploads page just for authenticated users
app.get("/account", function(req, res) {
  if(req.isAuthenticated()) {
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          const name = foundUser.name;
          const photos = foundUser.photos;
          Uploads.find({"_id": photos}, function(err, foundPhotos){
            if (!err) {
              res.render("account", {name: name, images: foundPhotos, user: req.user});
            }
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

// @desc Account details page just for authenticated users
app.get("/details", function(req, res) {
  if(req.isAuthenticated()) {
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          const name = foundUser.name;
          const username = foundUser.username;
          const uploads = foundUser.photos.length;
          res.render("details", {name: name, user: req.user, username: username, uploads: uploads});
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/cart", function(req, res) {
  if(req.isAuthenticated()) {
    Cart.find({userID: req.user.id}, function(err, foundItems){
      if (err) {
        console.log(err);
      } else {
        products = [];
        foundItems.forEach(function(item) {
          products.push(item.productID);
        });
        Uploads.find({_id: products}, function(err, foundImages){
          if (err) {
            console.log(err);
          } else {
            let total = 0;
            count = foundImages.length;
            foundImages.forEach(function(image) {
              total += image.price;
            });
            res.render("cart", {items: foundImages, qty: count, total: total, user: req.user});
          }
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function(req, res){
  res.render("login", {user: req.user});
});

app.get("/register", function(req, res){
  res.render("register", {user: req.user});
});

app.get("/alert", function(req, res){
  res.render("alert", {user: req.user});
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

// @route POST
// @desc register page, registered users redirected to the account
app.post("/register", function(req, res){

  User.register({name: req.body.name, username: req.body.username, cartItems: 0}, req.body.password, function(err,user) {
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      passport.authenticate('local') (req, res, function() {
        res.redirect("/account");
      });
    }
  });
});
 // @desc login page, redirected to the account
app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      passport.authenticate('local') (req, res, function() {
        res.redirect("/account");
      });
    }
  });
});

// @route POST /upload
// @desc Uploads file to DB

app.post("/upload", upload.array("myImages", 6), function(req, res) {
  const files = req.files;
  if(!files) {
    const error = new Error("No files selected!");
    error.httpStatusCode(400);
    return next(error);
  }
  // convert images into base64 encoding
  // fs converts an img to a buffer data
  let ImgArray = files.map(function(file) {
    let img = fs.readFileSync(file.path);
    return encode_image = img.toString('base64');
  });

  ImgArray.map(function(src, index) {
    // create obj to store data in the collection
    let finalImg = {
      filename: files[index].originalname,
      contentType: files[index].mimetype,
      imageBase64: src,
      title: "Title",
      genre: "Genre",
      author: "Author",
      price: 0,
      amount: 1
    }

    let newUpload = new Uploads(finalImg);

    // Saving the uploads from the user
    // to user account by id reference
    // to uplodas collection
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.photos.push(newUpload._id);
          foundUser.save();
          console.log("Successfully saved to user account.");
          newUpload.save(function(err){
            if(err) {
              console.log(err);
            }
            console.log("Successfully saved to home page.");
          });
        }
      }
    });
  });
  res.redirect("/account");
});

app.post("/delete", function(req, res) {
  const image_id = req.body.image;

  function arrayRemove(arr, value) {
    return arr.filter(function(ele){
      return ele != value;
    });
  }

  // Delete item from account page (users collection)
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        var result = arrayRemove(foundUser.photos, image_id);
        foundUser.photos = result;
        foundUser.save();
        // Delete item from home page (uploads collection)
        Uploads.findByIdAndRemove({_id: image_id}, {useFindAndModify: false}, function(err){
          if (err) {
            console.log(err);
          }
        });
      }
    }
  });
  res.redirect("/account");
});

// Edit the selected image info.
app.post("/edit", function(req, res) {
  const image_id = req.body.imgEdit;

  Uploads.findById({_id: image_id}, function(err, foundImg){
    if (err) {
      console.log(err);
    } else {
      const req = request('https://www.googleapis.com/books/v1/volumes?q=' + foundImg.title +'&key=', function(error, response, body) {
        const library = JSON.parse(body);
        const firstBook = library.items[0].volumeInfo;
        const bookDesc = firstBook.description;
        const rating = firstBook.averageRating;
        const bookLink = firstBook.infoLink;
        // console.log(firstBook);
        res.render("image", {image: foundImg, edit: "block", view: "none", user: req.user, bookDesc: bookDesc, bookLink: bookLink, rating: rating});
      });
      req.end();
    }
  });
});

// Saving the info of an edited image to the db.
app.post("/save", function(req, res) {
  const image_id = req.body.save;
  const image_title = req.body.title;
  const image_desc = req.body.genre;
  const image_artist = req.body.author;
  const image_price = req.body.price;

  Uploads.findById({_id: image_id}, function(err, foundImg){
    if (err) {
      console.log(err);
    } else {
      foundImg.title = image_title;
      foundImg.genre = image_desc;
      foundImg.price = image_price;
      foundImg.author = image_artist;
      foundImg.save();
    }
  });
  res.redirect("/account");
});

// Viewing the picture in a large format and its info
app.post("/view", function(req, res) {
  const image_id = req.body.itemView;

  Uploads.findById({_id: image_id}, function(err, foundImg){
    if (err) {
      console.log(err);
    } else {
      const req = request('https://www.googleapis.com/books/v1/volumes?q=' + foundImg.title +'&key=', function(error, response, body) {
        const library = JSON.parse(body);
        const firstBook = library.items[0].volumeInfo;
        const bookDesc = firstBook.description;
        const rating = firstBook.averageRating;
        const bookLink = firstBook.infoLink;
        // console.log(firstBook);
        res.render("image", {image: foundImg, edit: "none", view: "view", user: req.user, bookDesc: bookDesc, bookLink: bookLink, rating: rating});
      });
      req.end();
    }
  });
});

// Adding the selected item/image to the shopping cart.
app.post("/buy", function(req, res) {
  if(req.isAuthenticated()) {
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          const userId = foundUser._id;
          const imageId = req.body.itemBuy;
          foundUser.cartItems += 1;
          foundUser.save();

          Uploads.findById({_id: imageId}, function(err, foundImg){
            if (err) {
              console.log(err);
            } else {
              // Creating a new item to save in the cart collection.
              let newItem = new Cart({
                userID: userId,
                productID: foundImg._id
              });
              // Saving the item to the cart collection
              newItem.save(function(err){
                if(err) {
                  console.log(err);
                }
                console.log("Successfully saved to the cart.");
                res.redirect("/");
              });
            }
          });
        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

// Delete item from the cart (cart collection)
app.post("/cartdel", function(req, res) {
  const item_id = req.body.cartItem;
  // console.log(item_id);

  Cart.deleteOne({productID: item_id}, {useFindAndModify: false}, function(err){
    if (err) {
      console.log(err);
    } else {
      console.log("The item was successfully removed from the cart.");
      User.findById(req.user.id, function(err, foundUser){
        if (err) {
          console.log(err);
        } else {
          if (foundUser) {
            foundUser.cartItems -= 1;
            foundUser.save();
          }
        }
      });
    }
  });
  res.redirect("/cart");
});

// Send message from contacts
app.post("/email", function(req, res) {
  const email = req.body.email;
  const subject = req.body.subject;
  const text = req.body.message;
  // console.log(email, subject, text);

  sendMail(email, subject, text, function(err, data){
    if (err) {
      res.status(500).json({message: "Internal Error"});
    } else {
      res.redirect("/alert");
    }
  });
});

// Setting a port to dynamic and static.
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

// Listening to the port.
app.listen(port, function(){
  console.log("Server is running successfully.");
});
