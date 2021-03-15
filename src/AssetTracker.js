import BigNumber from "bignumber.js";
import moment from 'moment';
import {
  Stitch,
  AnonymousCredential,
  RemoteMongoClient
} from 'mongodb-stitch-browser-sdk';

const appClient = Stitch.initializeDefaultAppClient('grenade-tnats');
const svcClient = appClient.getServiceClient(RemoteMongoClient.factory, 'mongodb-atlas-grenade-stitch');

const dateSorter = (a, b) => (
    (moment(a.date) < moment(b.date))
        ? -1
        : (moment(a.date) > moment(b.date))
            ? 1
            : 0
);

const coinUnitMap = {
    bch: {
        monetary: {
            unit: 'bch',
        },
        fractional: {
            unit: 'satoshi',
            decimalPlaces: 8,
        },
    },
    btc: {
        monetary: {
            unit: 'btc',
        },
        fractional: {
            unit: 'satoshi',
            decimalPlaces: 8,
        },
    },
    dash: {
        monetary: {
            unit: 'dash',
        },
        fractional: {
            unit: 'duff',
            decimalPlaces: 8,
        },
    },
    dot: {
        monetary: {
            unit: 'dot',
        },
        fractional: {
            unit: 'planck',
            decimalPlaces: 10,
        },
    },
    eth: {
        monetary: {
            unit: 'eth',
        },
        fractional: {
            unit: 'wei',
            decimalPlaces: 18,
        },
    },
    ksm: {
        monetary: {
            unit: 'ksm',
        },
        fractional: {
            unit: 'planck',
            decimalPlaces: 12,
        },
    },
    ltc: {
        monetary: {
            unit: 'ltc',
        },
        fractional: {
            unit: 'litoshi',
            decimalPlaces: 8,
        },
    },
    xlm: {
        monetary: {
            unit: 'xlm',
        },
        fractional: {
            unit: 'stroop',
            decimalPlaces: 7,
        },
    },
    xrp: {
        monetary: {
            unit: 'xrp',
        },
        fractional: {
            unit: 'drop',
            decimalPlaces: 6,
        },
    },
    zec: {
        monetary: {
            unit: 'zec',
        },
        fractional: {
            unit: 'zatoshi',
            decimalPlaces: 8,
        },
    },
};

export default class AssetTracker {
    constructor(transactions, quotes) {
        this.quotes = quotes;
        this.transactions = transactions.sort(dateSorter);
        this.earliestDate = moment(this.transactions[0].date);
        this.latestDate = moment();
        this.assets = [...new Set(this.transactions.map(tx => tx.asset))].sort();
        this.balanceAtDate = (asset, date) => this.transactions
            .filter(tx => ((tx.asset === asset) && (moment(tx.date) <= date)))
            .reduce((accumulator, tx) => accumulator.plus(new BigNumber(tx.amount)), new BigNumber(0));
        const interval = 1000 * 60 * 60 * 24; // one day
        this.balances = Array.from(
            { length: (((this.latestDate - this.earliestDate) / interval) + 1) },
            (v, i) => new Date(this.earliestDate.valueOf() + (interval * i)).toISOString().slice(0, 10)
        ).map(date => ({
            ...Object.fromEntries(this.assets.map(asset => {
                const close = new Date(date);
                close.setHours(23, 59, 59);
                const balance = this.balanceAtDate(asset, close);
                return [
                    asset,
                    {
                        ...Object.fromEntries(quotes.filter(quote => ((quote.coin === asset) && (quote.date === date))).map(quote => [
                            quote.fiat,
                            balance.times(BigNumber(quote.open.amount).plus(BigNumber(quote.close.amount)).dividedBy(BigNumber(2))).toNumber()
                        ])),
                        [asset]: balance.toNumber(),
                    }
                ];
            })),
            date,
        }));
    }

    static fromGist(gistId) {
        return new Promise((resolve , reject) => {
            fetch(`https://api.github.com/gists/${gistId}`)
                .then((response) => response.json())
                .then((gist) => {
                    const transactions = Object.keys(gist.files)
                        .filter(_filename => _filename.endsWith('.json'))
                        .map(_filename => JSON.parse(gist.files[_filename].content))
                        .reduce((accumulator, _transactions) => [...accumulator, ..._transactions])
                        .filter(_transaction => Object.keys(coinUnitMap).includes(_transaction.asset))
                        .sort(dateSorter);
                    const earliestDate = transactions[0].date.slice(0, 10);
                    const latestDate = moment().toISOString().slice(0, 10);
                    appClient.auth
                        .loginWithCredential(new AnonymousCredential())
                        .then(() => {
                            svcClient.db('grenade')
                                .collection('quote')
                                .find(
                                    {
                                        $and: [
                                            {
                                                coin: {
                                                    $in: [...new Set(transactions.map(tx => tx.asset))]
                                                }
                                            },
                                            {
                                                date: {
                                                    $gte: earliestDate
                                                }
                                            },
                                            {
                                                date: {
                                                    $lte: latestDate
                                                }
                                            }
                                        ]
                                    }
                                )
                                .asArray()
                                .then(quotes => {
                                    resolve(new AssetTracker(transactions, quotes));
                                });
                        });
                })
                .catch((error) => {
                    reject(error);
                });          
        });
    }
};