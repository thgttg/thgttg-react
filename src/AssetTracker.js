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
    algo: {
        monetary: {
            unit: 'algo',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
        },
    },
    band: {
        monetary: {
            unit: 'band',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
        },
    },
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
    celo: {
        monetary: {
            unit: 'celo',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
        },
    },
    comp: {
        monetary: {
            unit: 'comp',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
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
    grt: {
        monetary: {
            unit: 'grt',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
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
    mkr: {
        monetary: {
            unit: 'mkr',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
        },
    },
    nu: {
        monetary: {
            unit: 'nu',
        },
        fractional: {
            unit: 'unknown',
            decimalPlaces: -1,
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
        const assets = [...new Set(transactions.map(tx => tx.asset))].sort();
        const currencies = [...new Set(quotes.map(quote => quote.fiat))].sort();
        this.assets = assets;
        this.quotes = quotes.map((quote) => {
            const quoteYesterday = quotes.find(candidate => ((candidate.coin === quote.coin) && (candidate.fiat === quote.fiat) && (candidate.date === moment.utc(quote.date).startOf('day').subtract(1, 'day').toISOString().slice(0, 10))))
            return {
                ...quote,
                change: (!!quoteYesterday) ? ((BigNumber(quote.close.amount).minus(BigNumber(quoteYesterday.close.amount))).dividedBy(BigNumber(quoteYesterday.close.amount)).times(100)) : 0
            };
        });
        this.todaysQuotes = Object.fromEntries(assets.map(asset => [
            asset,
            Object.fromEntries(currencies.map(currency => [
                currency,
                this.quotes.find(quote => ((quote.coin === asset) && (quote.fiat === currency) && (quote.date === moment.utc().startOf('day').toISOString().slice(0, 10))))
            ]))
        ]));
        this.currencies = currencies;
        this.transactions = transactions.sort(dateSorter);
        this.earliestDate = moment.utc(this.transactions[0].date).startOf('day').toISOString().slice(0, 10);
        this.latestDate = moment.utc().endOf('day').toISOString();
        console.log(`earliest: ${this.earliestDate}, latest: ${this.latestDate}`);
        this.quoteAtDate = (asset, currency, date) => this.quotes
            .find(quote => ((quote.coin === asset) && (quote.fiat === currency) && (quote.date === date)));
        this.balanceAtDate = (asset, date) => this.transactions
            .filter(tx => ((tx.asset === asset) && (moment.utc(tx.date) <= date)))
            .reduce((accumulator, tx) => accumulator.plus(new BigNumber(tx.amount)), new BigNumber(0));
        this.balances = Array.from(
            {
                length: ((moment(this.latestDate).startOf('day').diff(moment(this.earliestDate).startOf('day'), 'days')) + 1)
            },
            (v, i) => moment(this.earliestDate).startOf('day').add(i, 'days').toISOString().slice(0, 10)
        ).map(date => ({
            // todo: filter out assets where balance is always zero
            ...Object.fromEntries(this.assets.map(asset => {
                const balance = this.balanceAtDate(asset, moment.utc(date).endOf('day'));
                return [
                    asset,
                    {
                        ...Object.fromEntries(quotes.filter(quote => ((quote.coin === asset) && (quote.date === date))).map(quote => [
                            quote.fiat,
                            balance.times(BigNumber(quote.close.amount)).decimalPlaces(2).toNumber() || BigNumber(0).toNumber()
                        ])),
                        [asset]: balance.toNumber(),
                    }
                ];
            })),
            date,
        })).map(balance => ({
            ...balance,
            total: Object.fromEntries(currencies.map(currency => [
                currency,
                assets.reduce((acc, asset) => acc + (balance[asset][currency] || 0), 0)
            ]))
        }));
        const latestBalance = [...this.balances].pop();
        const penultimateBalance = [...this.balances].slice(-2, -1)[0];
        this.latestBalance = Object.fromEntries([...assets, ...['total']].filter(asset => ((asset === 'total') || (!!latestBalance[asset][asset]))).map(asset => [
            asset,
            Object.fromEntries(currencies.map(currency => [
                currency,
                {
                    amount: (asset !== 'total') ? latestBalance[asset][asset] : 0,
                    value: latestBalance[asset][currency],
                    change: {
                        day: ((latestBalance[asset][currency] - (penultimateBalance[asset][currency] || 0)) / (penultimateBalance[asset][currency] || 0) * 100)
                    }
                }
            ]))
        ]));
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
                    const assets = [...new Set(transactions.map(tx => tx.asset))];
                    const earliestDate = moment.utc(transactions[0].date).startOf('day').toISOString().slice(0, 10);
                    const latestDate = moment.utc().endOf('day').toISOString().slice(0, 10);
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
                                                    $in: assets
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