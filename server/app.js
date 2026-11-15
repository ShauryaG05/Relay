const express = require("express")
const app = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/",(req,res)=>{
    res.send("Hello")
})
app.post("/lock",(req,res)=>{
    res.send(" Lock Command will be processed from here!!! ")
})

module.exports = app