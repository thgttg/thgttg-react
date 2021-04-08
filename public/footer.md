#### about this page

**thgttg** is an acronym for *the hodlers guide to the galaxy*.

the source code for this page lives at [github.com/thgttg/thgttg-react](https://github.com/thgttg/thgttg-react). the page is hosted by github pages at [github.com/thgttg/thgttg.github.io](https://github.com/thgttg/thgttg.github.io).

the app works by reading a github gist containing json files filled with transaction data.

if you've arrived at this page without specifying a gist in the url or with a cookie from a previous visit, the page defaults to displaying the demo gist at [gist.github.com/8124c7d...](https://gist.github.com/8124c7dbcb6bdef3b81124ca974f635c).

#### viewing other portfolios

you can create your own portfolio page by exporting data from your crypto wallets or exchange accounts and creating a secret gist with one json file for each wallet or exchange that you hold crypto on. then just visit https://thgttg.com/#your-gist-id-goes-here. (eg: https://thgttg.com/#8124c7dbcb6bdef3b81124ca974f635c).

currently you have to create the gist json files matching the schema shown in the demo gist. when i get around to implementing it, i'll make it possible to just use the csv format exposed by most exchange export functions.

this page will store two cookies in your browser.

* the cookie named **currency** will hold the name of the fiat currency to show portfolio values in. its value changes whenever you use the currency selector at the top of the page.
* the cookie named **gist** will store the gist id of the last portfolio you viewed here so that you default to the same portfolio next time you visit the page.

#### privacy

this site doesn't track what gists you view here (you may verify this in the [source](https://github.com/thgttg/thgttg-react)), so if you've used a secret gist, there's no good reason for anyone else to be able to discover your portfolio or its value. github secret gists are publicly accessible to anyone who knows or can guess the gist id which is a 32 character hash. in practice this is a pretty difficult guess to make. it will however be available to people who can read your browsing history (ie: because they have access to your computer).
