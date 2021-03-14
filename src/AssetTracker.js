export default class AssetTracker {
    constructor(transactionsCollections) {
        this.transactions = transactionsCollections
            .reduce((accumulator, transactions) => [...accumulator, ...transactions])
            .sort((a, b) => (
                (Date.parse(a.date) < Date.parse(b.date))
                    ? -1
                    : (Date.parse(a.date) > Date.parse(b.date))
                        ? 1
                        : 0
            ));
        this.earliestDate = Date.parse(this.transactions[0].date);
        this.latestDate = Date.parse([...this.transactions].pop().date);
        this.assets = [...new Set(this.transactions.map(tx => tx.asset))].sort();
        this.balanceAtDate = (asset, date) => this.transactions
            .filter(tx => ((tx.asset === asset) && (Date.parse(tx.date) <= date)))
            .reduce((a, b) => a.amount + b.amount, 0);
        const interval = 1000 * 60 * 60 * 24; // one day
        this.balances = Array.from(
            { length: (((this.latestDate - this.earliestDate) / interval) + 1) },
            (v, i) => new Date(this.earliestDate.valueOf() + (interval * i))
        ).map(date => ({
            ...Object.fromEntries(this.assets.map(asset => [asset, this.balanceAtDate(asset, date)])),
            date: new Intl.DateTimeFormat('en-GB').format(date),
        }));
    }

    static fromGist(gistId) {
        return new Promise((resolve , reject) => {
            fetch(`https://api.github.com/gists/${gistId}`)
                .then((response) => response.json())
                .then((gist) => {
                    const transactionsCollections = Object.keys(gist.files)
                        .filter(_filename => _filename.endsWith('.json'))
                        .map(_filename => JSON.parse(gist.files[_filename].content));
                    resolve(new AssetTracker(transactionsCollections));
                })
                .catch((error) => {
                    reject(error);
                });          
        });
    }
};