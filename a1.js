//const prod = require('./products.json');
const express = require('express');
const bp = require('body-parser')
const elasticlunr = require("elasticlunr");

const jsStringify = require('js-stringify');

const app = express();

app.use(express.urlencoded({extended: true}));
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

// static folder
app.use(express.static('public'))

app.set('views', './views/pages');
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

const {Matrix} = require("ml-matrix");

// lab3 starts - crawl example
//Required module (install via NPM - npm install crawler)
const Crawler = require("crawler");

//lab4
//Create your index
//Specify fields you want to include in search
//Specify reference you want back (i.e., page ID)
// FOR FRUIT index
const fruitIndex = elasticlunr(function () {
    this.addField('title');
    this.addField('paragraph');
    this.addField('name'); // this is actually the url
    this.setRef('pageId');
});

//FOR PERSONAL index
const personalIndex = elasticlunr(function () {
    this.addField('title');
    this.addField('paragraph');
    this.addField('name'); // this is actually the url
    this.setRef('pageId');
});

//FOR FRUITS
//initialization
let nodes = ["https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html"];
let runFlag = true;
//define the incoming structure
var incomingLinks = [];

//define the page detail structure
let pages = [];
let urlPrefix = "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/";
let ID = 0;
let NameIdPairList = [];

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
var N = 1000;
var adjList = Array.from(Array(N), ()=>Array().fill(0));
var alpha = 0.1;
var marginOfError = 0.001;
var teleportMatrix = Array.from(Array(N), ()=>Array(N).fill(alpha*1/N));

//FOR FRUITS
//schema stuff for incoming links
const schema = new mongoose.Schema({ name: String, parents: [String], numberofIncomingLinks: Number});
const fruitIncomingLink = mongoose.model('fruitIncomingLink', schema);

//schema stuff for outgoing links
const outgoingschema = new mongoose.Schema({ title: String, name: String, paragraph: String, children: [Object], outgoinglinks: Number, pageId: Number, rank: Number});
const fruitPages = mongoose.model('fruitPages', outgoingschema);

//FOR PERSONAL
//schema stuff for incoming links
const pIncschema = new mongoose.Schema({ name: String, parents: [String], numberofIncomingLinks: Number});
const personalIncomingLink = mongoose.model('personalIncomingLink', pIncschema);

//schema stuff for outgoing links
const pOutgoingschema = new mongoose.Schema({ title: String, name: String, paragraph: String, children: [Object], outgoinglinks: Number, pageId: Number, rank: Number});
const personalPages = mongoose.model('personalPages', pOutgoingschema);

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
            
            //console.log("Title : " + $("title").text());
            //console.log("Paragraphs: " + $("p").text());
            page.paragraph = $("p").text().trim();
            page.title = $("title").text();
            page.name = res.options.uri;
            // console.log("base uri : " + res.options.uri);
 
            let NameIdPair = {};
            var foundPair = NameIdPairList.filter((x) => x.name == page.name).pop();
            if (typeof foundPair === "undefined"){// no pageId for the page
                //assign pageId for each page
                page.pageId = ID;
                //save page name, id information in the nameIdPair list
                NameIdPair.name = page.name;
                NameIdPair.id = page.pageId;
                NameIdPairList.push(NameIdPair);
                ID = ID + 1;
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
                // console.log($(link).text() + ':  ' + $(link).attr('href'));
                //arrange the full url for each href
                //for fruits/tinyfruit crawling, we arrange full url
                //for real web sites, we only crawl href with url starting with "https:"
                let url = "";
                if ($(link).attr('href').substring(0,6) === "https:"){
                    url = $(link).attr('href');
                }
                else{ // for example, ./N-3.html
                    url = urlPrefix + $(link).attr('href').substring(2);
                }

                // incoming links gathering to structure
                let inNode = {};
                inNode.name = "";
                inNode.parents = [];
                inNode.numberofIncomingLinks = 0;

                var foundNode = incomingLinks.filter((x) => x.name == url).pop();
                //console.log("foundNode: " + foundNode);
                if (typeof foundNode === "undefined"){// node name is new to structure
                    inNode.name = url;
                    inNode.parents.push(page.name);
                    inNode.numberofIncomingLinks = 1;
                    incomingLinks.push(inNode);
                }
                // node name already exists
                else {
                    foundNode["parents"].push(page.name);
                    foundNode["numberofIncomingLinks"] = foundNode["parents"].length;
                }

                // page detail with outgoing links
                let child = {};
                child.name = url;
                page.children.push(child);
                page.outgoinglinks += 1;

                let NameIdPair = {};
                var foundPair = NameIdPairList.filter((x) => x.name == child.name).pop();
                if (typeof foundPair === "undefined"){// no pageId for the page
                    child.pageId = ID
                    //save page name, id information in the nameIdPair list
                    NameIdPair.name = child.name;
                    NameIdPair.id = ID;
                    NameIdPairList.push(NameIdPair);
                    ID = ID + 1;
                }
                else {
                    child.pageId = foundPair["id"];
                }

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
                if (runFlag == true){                    
                    nodes.push(url);
                    //adding to queue for next run
                    c.queue(url);
                }
               
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

    //after all the nodes crawling, 
    //adjacency matrix
    var adjMatrix = convert(adjList, N);
    console.log(adjMatrix);

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

    // Start iteration
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
    // console.log("final x : " + x0);
    
    // store page rank
    for(var j = 0; j < N; j++){
        var foundPage = pages.filter((x) => x.pageId == j).pop();
        foundPage.rank = x0.get(0,j);            
    }
    // console.log("pages : " + JSON.stringify(pages));

    //store into db
    fruitIncomingLink.insertMany(incomingLinks, function(err, result){
        if(err){
            throw err;
        }
    });
    console.log("fruit incomingLinks successfully added.");

    
    fruitPages.insertMany(pages, function(err, result){
        if(err){
            throw err;
        }
    });
    console.log("fruit pages successfully added.");

});

//global var for function below
let fruitIndexFlag = false;

function fillFruitIndex() {
    //to ensure we only add to index once
    if(fruitIndexFlag == false){
        console.log("DEBUG INDEX: adding to fruits index.");
        //add docs to index
        fruitPages.find(function(err, result){
            if(err){
                console.log("err response: " + err);
                //throw err;
            }
            if(result){
                //console.log(JSON.stringify(result));
                for (let i = 0; i < result.length; i++){
                    let tempResult = result[i].toObject();
                    // console.log(tempResult);
                    // console.log("br");
                    fruitIndex.addDoc(tempResult);
                }
            }
        });
        console.log("fruit index successfully added.");
        fruitIndexFlag = true;
    }
    else {
        console.log("fruit index already added");
    }
    return;
}

//global var for function below
let personalIndexFlag = false;

function fillPersonalIndex() {
    //to ensure we only add to index once
    if(personalIndexFlag == false){
        console.log("DEBUG INDEX: adding to personal index.");
        //add docs to index
        personalPages.find(function(err, result){
            if(err){
                console.log("err response: " + err);
                //throw err;
            }
            if(result){
                //console.log(JSON.stringify(result));
                for (let i = 0; i < result.length; i++){
                    let tempResult = result[i].toObject();
                    // console.log(tempResult);
                    // console.log("br");
                    personalIndex.addDoc(tempResult);
                }
            }
        });
        console.log("personal index successfully added.");
        personalIndexFlag = true;
    }
    else {
        console.log("personal index already added");
    }
    return;
}

//landing page
app.get('/', function(req,res){
    res.render('landing');
});

//fruits search page
app.get('/fruits', function(req,res){
    console.log("Selected fruits option.");
    console.log("Filling fruit index (if not already filled).");
    fillFruitIndex();
    var optionName = "fruits";
    res.status(200).render("search", {jsStringify, optionName});
});

//personal search page
app.get('/personal', function(req,res){
    console.log("Selected personal option.");
    console.log("Filling personal index (if not already filled).");
    fillPersonalIndex();
    var optionName = "personal";
    res.status(200).render("search", {jsStringify, optionName});
});

//TODO: remove
//get top 10 most popular sites
app.get('/popular', function(req,res){
    console.log("passing in:" + req);
    fruitIncomingLink.find()
      .sort({numberofIncomingLinks: -1})
      .limit(10)
      .exec(function (err, results) {
        console.log(results)
        res.status(200).render("popular", {sites: results});
      });
});

//FOR FRUIT: get specific sites info
app.get('/fruits/site/:pageId', function(req,res){
    console.log("passing in:" + req.params.pageId);
    fruitPages.findOne({pageId: req.params.pageId}, function(err, result){
        console.log("found it!");
        if(err){
            console.log("err response: " + err);
            //throw err;
        }
        if(result){
            // console.log(JSON.stringify(result));
            console.log("DEBUG WORD FREQUENCY: about to find word frequency...");
            let wordFreq = {"index":[]}; //first array will be word, seconnd array will be value
            const wordFreqObj = getWordFrequency(result.paragraph);
            // console.log("DEBUG WORD FREQUENCY, OBJECT: " + JSON.stringify(wordFreqObj));
            for (var key in wordFreqObj){
                wordFreq["index"].push({ word: key, frequency: wordFreqObj[key] });
            }
            // console.log("DEBUG WORD FREQUENCY, index.word: " + JSON.stringify(wordFreq.index[1].word));
            fruitIncomingLink.findOne({name: result.name}, function(err, incomingResult){
                console.log("DEBUG SEARCH QUERY RESULT: found matching url!");
                if(err) throw err;
                res.status(200).render("siteinfo", {site: result, incomingSite: incomingResult, wordFreq: wordFreq});
            });
        }
    });
});

//FOR PERSONAL: get specific sites info
app.get('/personal/site/:pageId', function(req,res){
    console.log("passing in:" + req.params.pageId);
    personalPages.findOne({pageId: req.params.pageId}, function(err, result){
        console.log("found it!");
        if(err){
            console.log("err response: " + err);
            //throw err;
        }
        if(result){
            // console.log(JSON.stringify(result));
            console.log("DEBUG WORD FREQUENCY: about to find word frequency...");
            let wordFreq = {"index":[]}; //first array will be word, seconnd array will be value
            const wordFreqObj = getWordFrequency(result.paragraph);
            // console.log("DEBUG WORD FREQUENCY, OBJECT: " + JSON.stringify(wordFreqObj));
            for (var key in wordFreqObj){
                wordFreq["index"].push({ word: key, frequency: wordFreqObj[key] });
            }
            // console.log("DEBUG WORD FREQUENCY, index.word: " + JSON.stringify(wordFreq.index[1].word));
            personalIncomingLink.findOne({name: result.name}, function(err, incomingResult){
                console.log("DEBUG SEARCH QUERY RESULT: found matching url!");
                if(err) throw err;
                res.status(200).render("siteinfo", {site: result, incomingSite: incomingResult, wordFreq: wordFreq});
            });
        }
    });
});

function getWordFrequency(string){
    var words = string.replace(/[\n\r\W]/g, ' ').split(/\s/);
    var wordFreqHashMap = {};
    words.forEach(function(w) {
        //if not a word that already exists in the hasmap, create a new key
        if (!wordFreqHashMap[w]) {
            wordFreqHashMap[w] = 0;
        }
        wordFreqHashMap[w] += 1;
    });
    return wordFreqHashMap;
}

async function pageRankBoost(results, optionStr){
    console.log("DEBUG SCORE BOOSTING: testing to make sure we get here");
    if (optionStr == "fruits"){
        console.log("boosting fruit search score with page rank");
        for (let i = 0; i < results.length; i++){
            //find matching pageId in DB, multiply score by page rank value
            await fruitPages.findOne({pageId: parseInt(results[i].ref)}, function(err, dbResult){
                if(err) throw err;
                //console.log("DEBUG SCORE BOOSTING: page rank of " + dbResult.pageId + "is: " + dbResult.rank);
                results[i].score *= dbResult.rank;
            });
        }
    }
    else if (optionStr == "personal"){
        console.log("boosting personal search score with page rank");
        for (let i = 0; i < results.length; i++){
            //find matching pageId in DB, multiply score by page rank value
            await personalPages.findOne({pageId: parseInt(results[i].ref)}, function(err, dbResult){
                if(err) throw err;
                console.log("DEBUG SCORE BOOSTING: page rank of " + dbResult.pageId + "is: " + dbResult.rank);
                results[i].score *= dbResult.rank;
            });
        }
    }
    return results;
}

//FOR FRUITS: search functionality
app.get('/fruits/search', async function(req,res){

    let searchname = req.query.searchquery;
    let searchlimit = parseInt(req.query.searchlimit);
    let searchBoost = req.query.searchboost;

    //check text field parameter for search query
    if (searchname === ""){
        console.log("invalid query");
        res.status(401).send("Submitted invalid/undefined query.");
    }
    //check if search limit is valid
    if (typeof searchlimit === 'undefined' || searchlimit < 1 || searchlimit > 50){
        console.log("invalid search limit");
        res.status(401).send("Submitted invalid/undefined limit.");
    }
    console.log("DEBUG: SEARCH req.query.searchQuery: " + JSON.stringify(searchname));
    console.log("DEBUG: SEARCH req.query.searchlimit: " + searchlimit);
    console.log("DEBUG: SEARCH req.query.searchBoost: " + searchBoost);

    //running query
    let queries = searchname;
    console.log("Running query");
    console.log(`Querying for ${queries}:`);
    console.log(fruitIndex.search(queries, {}));
    let result = [];
    let searchResults = fruitIndex.search(queries, {});
    //perform boosting if option is true
    if (searchBoost == "true"){
        console.log("Search boost is true");
        searchResults = await pageRankBoost(searchResults, "fruits");
    }
    //perform sorting
    searchResults.sort((a,b) => parseFloat(b.score) - parseFloat(a.score));

    //get top searchlimit results, if there are not searchlimit amount of elements, break to avoid collecting undefined values
    for (let i = 0; i < searchlimit; i++){
        result.push(searchResults[i]);
        if (!searchResults[i + 1]){
            console.log("undefined value hit, exiting query array loop");
            break;
        }
    }
    console.log(result);
    if (typeof result[0] === 'undefined'){
        res.status(401).send("Query with no results.")
    }
    else{
        console.log("DEBUG SEARCH QUERY RESULT: about to search db for matching page Id");
        //from returned pageId, get information from DB
        let resultFromDB = [];
        for (let i = 0; i < result.length; i++){
            //find matching pageId in DB, store info into array
            await fruitPages.findOne({pageId: parseInt(result[i].ref)}, function(err, result){
                console.log("DEBUG SEARCH QUERY RESULT: found matching page id!");
                if(err) throw err;
                resultFromDB.push(result);
            });
        }
        // console.log("DEBUG SEARCH QUERY RESULT: Array " + resultFromDB);
        res.status(200).render("queryresult", {sites: resultFromDB, limit: searchlimit, dataSite: "/fruits/site/"});
    }
});

//FOR PERSONAL: search functionality
app.get('/personal/search', async function(req,res){

    let searchname = req.query.searchquery;
    let searchlimit = parseInt(req.query.searchlimit);
    let searchBoost = req.query.searchboost;

    //check text field parameter for search query
    if (searchname === ""){
        console.log("invalid query");
        res.status(401).send("Submitted invalid/undefined query.");
    }
    //check if search limit is valid
    if (typeof searchlimit === 'undefined' || searchlimit < 1 || searchlimit > 50){
        console.log("invalid search limit");
        res.status(401).send("Submitted invalid/undefined limit.");
    }
    console.log("DEBUG: SEARCH req.query.searchQuery: " + JSON.stringify(searchname));
    console.log("DEBUG: SEARCH req.query.searchlimit: " + searchlimit);
    console.log("DEBUG: SEARCH req.query.searchBoost: " + searchBoost);

    //running query
    let queries = searchname;
    console.log("Running query");
    console.log(`Querying for ${queries}:`);
    console.log(personalIndex.search(queries, {}));
    let result = [];
    let searchResults = personalIndex.search(queries, {});
    //perform boosting if option is true
    if (searchBoost == "true"){
        console.log("Search boost is true");
        searchResults = await pageRankBoost(searchResults, "personal");
    }
    //perform sorting
    searchResults.sort((a,b) => parseFloat(b.score) - parseFloat(a.score));

    //get top searchlimit results, if there are not searchlimit amount of elements, break to avoid collecting undefined values
    for (let i = 0; i < searchlimit; i++){
        result.push(searchResults[i]);
        if (!searchResults[i + 1]){
            console.log("undefined value hit, exiting query array loop");
            break;
        }
    }
    console.log(result);
    if (typeof result[0] === 'undefined'){
        res.status(401).send("Query with no results.")
    }
    else{
        console.log("DEBUG SEARCH QUERY RESULT: about to search db for matching page Id");
        //from returned pageId, get information from DB
        let resultFromDB = [];
        for (let i = 0; i < result.length; i++){
            //find matching pageId in DB, store info into array
            await personalPages.findOne({pageId: parseInt(result[i].ref)}, function(err, result){
                console.log("DEBUG SEARCH QUERY RESULT: found matching page id!");
                if(err) throw err;
                resultFromDB.push(result);
            });
        }
        // console.log("DEBUG SEARCH QUERY RESULT: Array " + resultFromDB);
        res.status(200).render("queryresult", {sites: resultFromDB, limit: searchlimit, dataSite: "/personal/site/"});
    }
});

//Queue a URL, which starts the crawl
c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');
// c.queue('https://people.scs.carleton.ca/~davidmckenney/tinyfruits/N-0.html');