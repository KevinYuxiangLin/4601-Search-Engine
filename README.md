COMP 4601 Assignment #1 - Fruits and Japan!

Kevin Lin - 101110242

Finished all base requirements. No bonus parts were completed.

To run:
run command: 'npm install'
then run command: 'node .\addPersonalSiteDB.js' 
after the collections have been added to the database, stop running .\addPersonalSiteDB.js
then run command: 'node .\a1.js'

Key URLs:
Landing page: http://localhost:3000/
User is able to choose whether they'd like to query the fruits site or the culture of Japan on Wikipedia.

Search pages: http://localhost:3000/fruits or http://localhost:3000/personal
These pages function as the actual search page for their respective resource. They both load the same search page.
First textfield is for the text search query, checkbox is whether or not user would like to boost their results with the page's PageRank value.
Second textfield is for search limit, limited to minimum 1, and maximum 50 results. 

Example searchquery result pages:
http://localhost:3000/fruits/search?searchquery=apple&searchlimit=10&searchboost=false
Searching fruits,
With query: "apple"
Boosted by PageRank?: false
With search limit: 10

http://localhost:3000/personal/search?searchquery=japan&searchlimit=10&searchboost=false
Searching japan wiki,
With query: "japan"
Boosted by PageRank?: true
With search limit: 5

These pages display information of each result site:
Site Link
Site Name/Title
Site PageRank value
A link to more data about that specific site
Site ID

Example site data pages: http://localhost:3000/fruits/site/37 or http://localhost:3000/personal/site/116
These pages display more information about the specific site specified by the site's unique pageId in the url. 
These pages display information of each result site:
Site Link
Site Name/Title
Site Body/paragraph text
Number of outgoing and incoming links
List of outgoing and incoming links
Word frequency of the site body/paragraph