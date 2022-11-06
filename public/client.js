let product = {};
let searchCriteria = [];
let products = []; 
let reviews = [];

function findhref() {
	let searchQuery = document.getElementById("searchQuery").value;
	let searchLimit = document.getElementById("searchLimit").value;
	let searchBoost;
	if (document.getElementById('pageRankBoost').checked) {
		searchBoost = "true";
	} else {
		searchBoost = "false";
	}
	//alert("find href called");
	console.log("IS THIS EVEN WORKING " + optionStr);
	if (optionStr == 'fruits'){
		var url = "http://localhost:3000/fruits/search";
	}
	else if (optionStr == 'personal'){
		var url = "http://localhost:3000/personal/search";
	}
	var url = "http://localhost:3000/" + optionStr + "/search";
	var queryParam = "searchquery=" + searchQuery;
	var limitParam = "searchlimit=" + searchLimit;
	var boostParam = "searchboost=" + searchBoost;
	var href = url + "?" + queryParam + "&" + limitParam + "&" + boostParam;
	window.location.replace(href);
}