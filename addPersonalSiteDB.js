//const prod = require('./products.json');
const express = require('express');
const bp = require('body-parser')

const app = express();

app.use(express.urlencoded({extended: true}));
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

// static folder
app.use(express.static('public'))

app.set('views', './views');
app.set('view engine', 'pug');

const server = require('http').createServer(app);

const mongoose = require("mongoose");
mongoose.connect('mongodb://localhost/a1', function (err) {
  if (err) throw err;
  console.log('Successfully connected');
  // Start server once Mongo is initialized
  server.listen(3000, function () {
    console.log("Mongoose Listen : http://localhost:3000");
  });
});

//Required module (install via NPM - npm install crawler)
const Crawler = require("crawler");
//const $ = require("cheerio");
cheerio = require("cheerio");

//initialization
let nodes = ["https://en.wikipedia.org/wiki/Culture_of_Japan"];
let runFlag = true;
//define the incoming structure
var incomingLinks = [];

//define the page detail structure
let pages = [];
//let urlPrefix = "https://people.scs.carleton.ca/~davidmckenney/tinyfruits/";
let ID = 0;
let NameIdPairList = [];

const {Matrix} = require("ml-matrix");

// Function to insert vertices to adjacency list
function insert(adj, u, v)
{
    // Insert a vertex v to vertex u
    adj[u].push(v);
    return;
}
 
// Function to convert adjacency
// list to adjacency matrix
function convert(adj, N)
{
    // Initialize the adj matrix to 0
    var adjM = Array.from(Array(N), ()=>Array(N).fill(0));
    // fill up the 1s
    for (var i = 0; i < N; i++) {
        for (var j of adj[i])
        adjM[i][j] = 1;
    }
    return adjM;
}

// initial
var N = 800;
var adjList = Array.from(Array(N), ()=>Array().fill(0));
var alpha = 0.1;
var marginOfError = 0.001;
var teleportMatrix = Array.from(Array(N), ()=>Array(N).fill(alpha*1/N));

//schema stuff for incoming links
const schema = new mongoose.Schema({ name: String, parents: [String], numberofIncomingLinks: Number});
const personalIncomingLink = mongoose.model('personalIncomingLink', schema);

//schema stuff for outgoing links
const outgoingschema = new mongoose.Schema({ title: String, name: String, paragraph: String, children: [Object], outgoinglinks: Number, pageId: Number, rank: Number});
const personalPages = mongoose.model('personalPages', outgoingschema);

//define the x0 matrix [1,0,0,0,0,0...]
let ini = [[]];
ini[0][0] = 1;
for(var j = 1; j < N; j++)
{
    ini[0][j] = 0;
}
// console.log("ini : " + ini);
// var arr = Array(N).fill(0);
// arr[0] = 1;
// console.log("arr : " + arr);
let x0 = new Matrix(ini);

var crawlingPages = 1;

const c = new Crawler({
    maxConnections : 10, //use this for parallel, rateLimit for individual
    //rateLimit: 1000,

    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            let page = {};
            page.name = "";
            page.title = "";
            page.paragraph = "";
            page.children = [];
            page.outgoinglinks = 0;
            let $ = res.$; //get cheerio data, see cheerio docs for info
            //let $ = cheerio.load(res.body); 
            //console.log("Title : " + $("title").text());
            //console.log("Paragraphs: " + $("p").text());
            page.paragraph = $("p").text();
            page.title = $("title").text();
            page.name = this.uri; //res.options.uri;
            // console.log("base uri : " + this.uri);//res.options.uri);
 
            let NameIdPair = {};
            var foundPair = NameIdPairList.filter((x) => x.name == page.name).pop();
            if (typeof foundPair === "undefined"){// no pageId for the page
                if (ID < N) {
                    //assign pageId for each page
                    page.pageId = ID;
                    //save page name, id information in the nameIdPair list
                    NameIdPair.name = page.name;
                    NameIdPair.id = page.pageId;
                    NameIdPairList.push(NameIdPair);
                    ID = ID + 1;
                }
            }
            else {
                page.pageId = foundPair["id"];
            }

            // prepare the matrix row start
            let vertexi = page.pageId;
                       
            //links is a array of nodes - each node (a web link) has attribute, parent, children
            let links = $("a") //get all links from page
            $(links).each(function(i, link){
                //In real crawler, do processing, decide if they need to be added to queue
                
                //console.log("link info : " + $(link).text() + ':  ' + $(link).attr('href'));
                
                //for real web sites, we only crawl href with url starting with "https:"
                let url = "";
                if (($(link).attr('href') != undefined) && ($(link).attr('href').substring(0,5) === "/wiki") ){
                    url = "https://en.wikipedia.org" + $(link).attr('href');
                
                    // incoming links gathering to structure
                    let inNode = {};
                    inNode.name = "";
                    inNode.parents = [];
                    inNode.numberofIncomingLinks = 0;

                    var foundNode = incomingLinks.filter((x) => x.name == url).pop();
                    //console.log("foundNode: " + foundNode);
                    if (typeof foundNode === "undefined") {// node name is new to structure
                        if (incomingLinks.length < N){
                            inNode.name = url;
                            inNode.parents.push(page.name);
                            inNode.numberofIncomingLinks = 1;
                            incomingLinks.push(inNode);
                        }
                    }
                    // node name already exists
                    else {
                        var existingParent = foundNode["parents"].filter((x) => x == page.name).pop();
                        if (typeof existingParent === "undefined") {//to prevent repeated parents
                            foundNode["parents"].push(page.name);
                            foundNode["numberofIncomingLinks"] = foundNode["parents"].length;
                        }
                    }

                    // page detail with outgoing links
                    let child = {};
                    let NameIdPair = {};
                    var foundPair = NameIdPairList.filter((x) => x.name == url).pop();
                    if (typeof foundPair === "undefined"){// no pageId for the page
                        if (ID < N){
                            child.pageId = ID
                            child.name = url;
                            //save page name, id information in the nameIdPair list
                            NameIdPair.name = url;
                            NameIdPair.id = ID;
                            NameIdPairList.push(NameIdPair);
                            ID = ID + 1;                           
                        }
                    }
                    else {
                        child.pageId = foundPair["id"];
                        child.name = url;
                    }
                    if ((child.name != undefined) && (child.pageId != undefined)){
                        page.children.push(child);
                        page.outgoinglinks += 1;
    
                        // prepare matrix columns for the row
                        let vertexj = child.pageId;
                        // insert the vertex to the adjacency list 
                        insert(adjList, vertexi, vertexj);
                        
                        //loop and flag is used to stop indefinitely running
                        runFlag = true;
                        for(i = 0; i<nodes.length; i++){
                            if (nodes [i] === url){
                                runFlag = false; 
                                break;
                            }
                        }
                        if (runFlag === true){ 
                            nodes.push(url);
                            // control the crawling
                            if (crawlingPages < N){
                                //adding to queue for next run
                                c.queue(url);
                                crawlingPages = crawlingPages + 1;
                            }
                        }                        
                    }//outgoing link has name and pageId
                }//page href exists and start with https://
            });
            pages.push(page);
            //console.log("page: " + JSON.stringify(page));
        }
        done();
    }
});

//Perhaps a useful event
//Triggered when the queue becomes empty
//There are some other events, check crawler docs
c.on('drain',function(){
    console.log("Done.");
    //console.log("incoming links: " + JSON.stringify(incomingLinks));
    //console.log("pages: " + JSON.stringify(pages));

    //after all the nodes crawling, 
    //adjacency matrix
    var adjMatrix = convert(adjList, N);
    //console.log(adjMatrix);

    // matrix transformation to P
    // if the whole row has only 0, then all elements for the row becomes 1/N
    // if the row has 1s, the 1s become the 1/sumof(1), e.g.
    // 0 1 0 1 0 1 --> 0 1/3 0 1/3 0 1/3 
    for(var i = 0; i < N; i++)
    {
        var rowTotalOnes = 0;
        for(var j = 0; j < N; j++)
        {
            if (adjMatrix[i][j] === 1){
                rowTotalOnes += 1;
            }
        }
        if (rowTotalOnes === 0){
            for(var j = 0; j < N; j++)
            {
                adjMatrix[i][j] = 1/N;
            }
        }
        else{
            for(var j = 0; j < N; j++)
            {
                if (adjMatrix[i][j] === 1){
                    adjMatrix[i][j] = 1/rowTotalOnes;
                }
            }
        }
    }
 
    // Final P = (1-alpha)*(adjMatrix) + teleportMatrix (note, teleportMatrix = alpha*1/N (nxn))
    const a = new Matrix(adjMatrix);
    const b = new Matrix(teleportMatrix);
    a.mul(1-alpha);
    //console.log("a: " + a);
    let P = a.add(b);
    //console.log("this is final P: ");
    //console.log(P);

    //Power iteration
    //In real application, exit after difference
    //between x_t and x_t+1 are below some threshold 0.1% - 0.001
    //OR 25 iterations which comes first 
    let iteration = true;
    for(let i = 0; i < 25; i++){
        if (iteration === true)
        {
            xi = x0;
            x0 = x0.mmul(P);
            xiplus1 = x0;
            for(var j = 0; j < N; j++)
            {
                if (Math.abs(xiplus1.get(0,j) - xi.get(0,j)) <= marginOfError){
                    iteration = false;
                }
                else{
                    iteration = true;
                    break;
                }
            }
        }
    }
    //console.log("final x : " + x0);
    
    // store page rank
    for(var j = 0; j < N; j++){
        var foundPage = pages.filter((x) => x.pageId == j).pop();
        foundPage.rank = x0.get(0,j);            
    }
    //console.log("pages : " + JSON.stringify(pages));

    // Save to DB
    //store into db
    personalIncomingLink.insertMany(incomingLinks, function(err, result){
        if(err){
            throw err;
        }
    });
    console.log("personal incomingLinks successfully added.");

    
    personalPages.insertMany(pages, function(err, result){
        if(err){
            throw err;
        }
    });
    console.log("personal pages successfully added.");

    // page ranks sorting
    let ranks = [];
    for(var j = 0; j < N; j++)
    {
        let rank = {};
        rank.id = j;
        rank.value = x0.get(0,j);
        ranks.push(rank);
    }
    //console.log("json object ranks: " + JSON.stringify(ranks));
    ranks.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
    console.log("sorted ranks: " + JSON.stringify(ranks));

    //display the top 10 for tinyfruits urls
    // console.log("The top 10 pages for tiny fruits:");
    // for(let i = 0; i < 10; i++){
    //     let j = i+1;
    //     let ranking = '#' + j;
    //     let rankingValue = '(' + ranks[i].value + ')';
    //     let page = 'https://people.scs.carleton.ca/~davidmckenney/tinyfruits/' + 'N-' + ranks[i].id + '.html';
    //     console.log(ranking + " " + rankingValue + " " + page);
    // }

});

//Queue a URL, which starts the crawl
//c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');
//c.queue('https://people.scs.carleton.ca/~davidmckenney/tinyfruits/N-0.html');

//c.queue('https://carleton.ca'); // maximum call stack size exceeded; need check <a href
//c.queue('https://carleton.ca/academics/');
//c.queue('https://www.sas.com/en_ca/home.html'); -- 
//c.queue('https://www.blackberry.com/us/en/products/devices'); -- maximum call stack size exceeded
//c.queue('https://support.microsoft.com/en-us'); //crawling errors
//c.queue('https://www.shopify.com/ca/manage');//crawling errors, currently 11 pipes (listeners) Use emitter.setMaxListeners() to increase limit
//c.queue('https://www.ricksteves.com/'); // easy out of domain
c.queue('https://en.wikipedia.org/wiki/Culture_of_Japan');