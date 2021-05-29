# My-Shop
My-Shop is a web app for stuff I want to sell.

The app was built with Node.js
* Express.js framework for Node.js
* Passport.js authentication middleware for Node.js
* EJS for JavaScript templating.
* MongoDB as database
* Mongoose.js for MongoDB object modeling for Node.js

The basic version has:

Security-
* Register - create your account user - button on the right side of the navbar
* Login if you already have an account - button on the right side of the navbar or by clicking on the user icon
* Log out if you finished with the app - user icon has a dropdown with logout option

Add Items -
* Upload item photo/photos via your account - possible only when the user logged in.
* Choose the files and click on the upload button.
* User can upload inly jpg/jpeg/png type files.
* See all the item photos from all the users on the home page after an upload.
* See only the item photos you uploaded on your account.

Delete items -
* Delete a specific item via your account, by clicking on trash icon - possible only when the user logged in.
* The user can delete only his items when he logged in.
* The item deleted from account page and the home page all together.

Home page - all uploads from all the users
Account page - the users see just their uploads and can delete them

Edit item info -
* Update the title, description, artist name and price.
* Updating possible just for logged in user from his account.

View large item photo -
* View photo - enlarge the photo and see the info.

Cart - 
* Add item photo to a shopping cart - through a cart button on the photo.
* Cart page template for a checkout.
* Photo automatically added to a Cart collection in DB.


More features will be added in the next version:
* Sell photo
* Buy photo
* Price advise
