<h1>gsearch</h1>
<h5>API for making google search requests with captcha support</h5>

<h4>Installation</h4>
`npm install -S gsearch`

<h4>API explained</h4>
- <h5>Initailization (with deathbycaptcha as captcha solver)</h5>
   ````javascript
   var deathByCaptcha = require("deathbycaptcha")
   var dbc = new deathByCaptcha("username", "password")

   var gsearch = require("gsearch")
   var gs = new gsearch({solver: dbc})

   ````

- <h5>Initailization (with custom solver)</h5>
   ````javascript
   var captchaSolver = {
      solve: function (img, cb) {
         //doSomeCaptchaSolving
         if (err) {
            cb (null, {
               err: err,
               solution: null
            })
            return
         }
         
         cb (null, {
            err: null,
            solution: "solved captcha as string"
         })
      }
   }
   ````

- <h5>API methods</h5>
   - `gs.get(searchString, cb)`
      This is an async function which returns a `cb` with `(nullVar, respObj)`.<br>
      `nullVar` is a variable with `null` value.<br>
      `respObj` is an object with following structure :-
      ````javascript
      respObj = {
         err: null,
         resp: {}, // a response object from request library. use respObj.resp.body to get the html.
         parsed: {} // parsed html using whacko lib (a fork of cheerio). so you can apply css selectors directly.
      }
      ````

   - `gs.getSync(seachString)`
      This is a sync function which returns 'respObj' as described above.

- <h5>Note on callbacks</h5>
   The format of callbacks for this API is *not* `(err, resp)` but is `(nullVar, respObj)` where `err` is a property of `respObj`.<br>
   This is because I have used deasync lib which throws `err` if `(err, resp)` format if used for the callback which make the code to break.<r>
   Error handling is more easier as we can use `if` syntax instead of `try catch`. 

<h4>Test/Usage</h4>
````javascript
(function () {

   // var deathByCaptcha = require("deathbycaptcha")
   // var dbc = new deathByCaptcha("username", "password")

   var gsearch = require("gsearch")
   var gs = new gsearch({solver: {}}) // {solver: dbc} for using deathbycaptcha api

   console.log("Sync version")
   var searchPage = gs.getSync("Everyone shifting to nodejs?")
   if (!searchPage.err) {
      $ = searchPage.parsed
      $("a").each(function (i, a) {
         console.log($(a).attr("href"))
      })
   } else {
      console.log(searchPage.err)
   }

   console.log("\nAsync version")
   gs.get("Everyone shifting to nodejs?", function (nullVar, searchPage) {
      if (!searchPage.err) {
         $ = searchPage.parsed
         $("a").each(function (i, a) {
            console.log($(a).attr("href"))
         })
      } else {
         console.log(searchPage.err)
      }      
   })

})()
````

<h4>Donate</h4>
<p>If this repository helps you anyhow, please don't mind coming back and 
   <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=F3QQCWFPWHBYE" target="_blank">Buy Me Coffee</a>
OR you can use 
   <a href="https://gratipay.com/~xcelancer/" target="_blank">Gratipay</a>
to show your appreciation and gratitude.
</p>