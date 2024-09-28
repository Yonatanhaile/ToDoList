//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");                                                     
require('dotenv').config();

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Mongoose connection with updated options
const mongouri = process.env.MONGO_URI;

mongoose.connect(mongouri);
// Define schema with original variable names
const itemsSchema = new mongoose.Schema({
    name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
    name: "Welcome to your todolist!"
});

const item2 = new Item({
    name: "Hit the + button to add a new item."
});

const item3 = new Item({
    name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
    Item.find()
        .then(result => {
            if (result.length === 0) {
                Item.insertMany(defaultItems)
                    .then(() => {
                        console.log("Successfully inserted default items!");
                        res.redirect("/");
                    })
                    .catch(err => {
                        console.log("Error inserting default items: " + err);
                    });
            } else {
                res.render("list", { listTitle: "Today", newListItems: result });
            }
        })
        .catch(err => {
            console.log("Error retrieving items: " + err);
        });
});

app.post("/", function (req, res) {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const newItem = new Item({
        name: itemName
    });

    if (listName === "Today") {
        newItem.save()
            .then(() => res.redirect("/"))
            .catch(err => {
                console.log("Error saving item: " + err);
                res.redirect("/");
            });
    } else {
        List.findOne({ name: listName })
            .then(result => {
                if (result) {
                    result.items.push(newItem);
                    result.save()
                        .then(() => res.redirect("/" + listName))
                        .catch(err => {
                            console.log("Error saving item to custom list: " + err);
                            res.redirect("/" + listName);
                        });
                }
            })
            .catch(err => {
                console.log("Error finding custom list: " + err);
                res.redirect("/");
            });
    }
});

app.post("/delete", function (req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if(listName === "Today"){
      Item.findByIdAndDelete(checkedItemId)
      .then(() => {
          console.log("Successfully deleted item from DB");
          res.redirect("/");
      })
      .catch(err => {
          console.log("Error deleting item: " + err);
          res.redirect("/");
      });
    }
    else{
      List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}})
        .then(()=>{
            res.redirect("/" + listName);
        })
        .catch(err=>{
            console.log(err);
            
        })
    }


});

app.get("/:customListName", function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    List.findOne({ name: customListName })
        .then(foundList => {
            if (!foundList) {
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });
                list.save()
                    .then(() => res.redirect("/" + customListName))
                    .catch(err => console.log("Error creating new list: " + err));
            } else {
                res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
            }
        })
        .catch(err => console.log("Error finding list: " + err));
});

app.get("/about", function (req, res) {
    res.render("about");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log(`Server started on port ${PORT}`);
});