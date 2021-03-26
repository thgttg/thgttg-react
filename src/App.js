import React, { useState, useEffect } from 'react';
import BigNumber from "bignumber.js";
import Cookies from 'universal-cookie';
import moment from 'moment';

// bootstrap
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';

// recharts
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import AssetTracker from './AssetTracker';

// fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas, faCaretUp, faCaretDown, faCircle } from '@fortawesome/free-solid-svg-icons';
import { library } from '@fortawesome/fontawesome-svg-core';
library.add(fas, faCaretDown);
library.add(fas, faCaretUp);
library.add(fas, faCircle);

const cookies = new Cookies();
const colors = {
  bch: '#8dc351',
  btc: '#f7931a',
  dash: '#008ce7',
  dot: '#e71081',
  eth: '#444eec',
  ksm: '#8015ab',
  ltc: '#345d9d',
  uma: '#fe4b49',
  xlm: '#14b6e7',
  xrp: '#23292f',
  zec: '#ecb244',
  total: '#999999',
  default: '#cccccc',
};

const CustomToolTip = props => {
  const { active, payload, label, currency } = props;
  if (!active || !payload) {
    return null;
  }
  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '1em',
      border: '1px solid #cccccc',
    }}>
      <table style={{width: '100%'}}>
        <thead>
          <tr>
            <th colSpan="2">
              {moment(label).format("MMMM Do, YYYY").toLowerCase()}
            </th>
          </tr>
        </thead>
        <tbody>
          {
            payload.filter(x => x.name !== 'total' && x.value > 0).map((item) => (
              <tr key={item.name} style={{ color: (colors[item.name] || colors['default']) }}>
                <td>
                  {item.name}
                </td>
                <td className="text-right">
                  {Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(item.value)}
                </td>
              </tr>
            ))
          }
        </tbody>
        <tfoot>
          <tr style={{ color: colors.total, borderBottom: `1px dashed ${colors.total}`, borderTop: `1px dashed ${colors.total}` }}>
            <th>
              total
            </th>
            <th className="text-right">
              {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(payload.find((item) => item.name === 'total').value)}
            </th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, fill, asset, currency, balance }) => {
  const RADIAN = Math.PI / 180;

  const radiusForCoinValueLabel = innerRadius + (outerRadius - innerRadius) * 2;
  const xForCoinValueLabel = cx + radiusForCoinValueLabel * Math.cos(-midAngle * RADIAN);
  const yForCoinValueLabel = cy + radiusForCoinValueLabel * Math.sin(-midAngle * RADIAN);

  const radiusForFiatValueLabel = innerRadius + (outerRadius - innerRadius) * 1.2;
  const xForFiatValueLabel = cx + radiusForFiatValueLabel * Math.cos(-midAngle * RADIAN);
  const yForFiatValueLabel = cy + radiusForFiatValueLabel * Math.sin(-midAngle * RADIAN);

  const radiusForPercentLabel = innerRadius + (outerRadius - innerRadius) * 0.5;
  const xForPercentLabel = cx + radiusForPercentLabel * Math.cos(-midAngle * RADIAN);
  const yForPercentLabel = cy + radiusForPercentLabel * Math.sin(-midAngle * RADIAN);
  return (
    <>
      <text x={xForCoinValueLabel} y={yForCoinValueLabel} fill={fill} textAnchor={xForCoinValueLabel > cx ? 'start' : 'end'} dominantBaseline="central">
        {asset} {balance.amount}
      </text>
      <text x={xForFiatValueLabel} y={yForFiatValueLabel} fill={fill} textAnchor={xForFiatValueLabel > cx ? 'start' : 'end'} dominantBaseline="central">
        ({new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(balance.value)})
      </text>
      <text x={xForPercentLabel} y={yForPercentLabel} fill="white" textAnchor={xForPercentLabel > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </>
  );
};

function getHistoricalValue(amount, asset, currency, date, quotes) {
  const quote = quotes.find(quote => ((quote.fiat === currency) && (quote.coin === asset) && (quote.date === date.slice(0, 10))));
  if (!quote) {
    console.error(`failed to find quote using args: amount: ${amount}, asset: ${asset}, currency: ${currency}, date: ${date}, quotes.length,: ${quotes.length}`);
    return 0;
  }
  return BigNumber(amount).times(BigNumber(quote.open.amount).plus(BigNumber(quote.close.amount)).dividedBy(BigNumber(2))).decimalPlaces(2).toNumber();
}

function App() {
  const [dateRange, setDateRange] = useState({ from: moment.utc('2020-11-11').startOf('day'), to: moment.utc().endOf('day') });
  const [currency, setCurrency] = useState(cookies.get('currency') || 'eur');
  const [gistId, setGistId] = useState(window.location.href.match(/#[a-f0-9]{32}$/) ? window.location.href.split('#').pop() : cookies.get('gist') || '8272a8540d65584f16a2d3f6b9c34e4c');
  const [assetTracker, setAssetTracker] = useState(undefined);
  useEffect(() => {
    if(!!currency && currency.match(/^[a-z]{3}$/) && cookies.get('currency') !== currency) {
      cookies.set('currency', currency, { path: '/' });
    }
  }, [currency]);
  useEffect(() => {
    if(!!gistId && gistId.match(/^[a-f0-9]{32}$/) && cookies.get('gist') !== gistId) {
      cookies.set('gist', gistId, { path: '/' });
    }
  }, [gistId]);
  useEffect(() => {
    if (!!gistId && gistId.match(/^[a-f0-9]{32}$/)) {
      AssetTracker
        .fromGist(gistId)
        .then(setAssetTracker)
        .catch(console.error);
    }
  }, [gistId]);
  return (
    <Container fluid>
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand href="#">don&rsquo;t panic</Navbar.Brand>
        <Nav className="mr-auto">
        </Nav>
        <Form inline>
          <Form.Control
            type="text"
            style={{width: '7em'}}
            className="mr-sm-2"
            size="sm"
            disabled={true}
            value={moment.utc(dateRange.from).toISOString().slice(0, 10)}
            onChange={
              (event) => {
                const from = event.target.value;
                if (from.match(/^20[12][0-9]-[01][0-9]-[0123][0-9]$/)) {
                  setDateRange(_dateRange => ({
                    ..._dateRange,
                    from: moment.utc(from).startOf('day')
                  }));
                }
              }
            } />
          <Form.Control
            type="text"
            style={{width: '7em'}}
            className="mr-sm-2"
            size="sm"
            disabled={true}
            defaultValue={moment.utc(dateRange.to).toISOString().slice(0, 10)}
            onChange={
              (event) => {
                const to = event.target.value;
                if (to.match(/^20[12][0-9]-[01][0-9]-[0123][0-9]$/)) {
                  setDateRange(_dateRange => ({
                    ..._dateRange,
                    to: moment.utc(to).endOf('day')
                  }));
                }
              }
            } />
          <Form.Control
            type="text"
            placeholder="gist id"
            style={{width: '19em'}}
            className="mr-sm-2"
            size="sm"
            disabled={true}
            defaultValue={gistId}
            onChange={
              (event) => {
                const gistId = event.target.value;
                if (gistId.match(/^[a-f0-9]{32}$/)) {
                  setGistId(gistId);
                }
              }
            } />
          <Form.Control
            as="select"
            className="mr-sm-2"
            size="sm"
            defaultValue={currency}
            onChange={
              (event) => {
                const currency = event.target.value;
                if (currency.match(/^[a-z]{3}$/)) {
                  setCurrency(currency);
                }
              }
            }>
            <option>eur</option>
            <option>gbp</option>
            <option>usd</option>
          </Form.Control>
        </Form>
      </Navbar>
      <Row>
        {
          (!!assetTracker && !!assetTracker.latestBalance)
            ? (
                <Table hover size="sm" style={{margin: '50px 10px 10px 10px'}}>
                  <thead>
                    <tr>
                      <th style={{ color: colors.total }}>
                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(assetTracker.latestBalance.total[currency].value)}
                        <span style={{ marginLeft: '1em', color: (assetTracker.latestBalance.total[currency].change.day > 0) ? 'green' : (assetTracker.latestBalance.total[currency].change.day < 0) ? 'red' : 'black' }}>
                          <FontAwesomeIcon icon={["fas", (assetTracker.latestBalance.total[currency].change.day > 0) ? 'caret-up' : (assetTracker.latestBalance.total[currency].change.day < 0) ? 'caret-down' : 'circle']} />
                          {assetTracker.latestBalance.total[currency].change.day.toFixed(2)}%
                        </span>
                      </th>
                      {
                        Object.keys(assetTracker.latestBalance).filter(asset => (asset !== 'total')).map(asset => (
                          <React.Fragment key={asset}>
                            <th className="text-right">
                              <Image src={`${asset}.png`} alt={`${asset} logo`} style={{height: '20px', width: '20px'}} roundedCircle />
                            </th>
                            <th className="text-left" style={{ color: colors[asset] }}>
                              {asset}
                            </th>
                          </React.Fragment>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>
                        portfolio value
                      </th>
                      {
                        Object.keys(assetTracker.latestBalance).filter(asset => (asset !== 'total')).map(asset => (
                          <React.Fragment key={asset}>
                            <td className="text-right" style={{ color: colors[asset] }}>
                              {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(assetTracker.latestBalance[asset][currency].value)}
                            </td>
                            <td
                              style={{
                                color: (assetTracker.latestBalance[asset][currency].change.day > 0) ? 'green' : (assetTracker.latestBalance[asset][currency].change.day < 0) ? 'red' : 'black'
                              }}>
                              <FontAwesomeIcon icon={["fas", (assetTracker.latestBalance[asset][currency].change.day > 0) ? 'caret-up' : (assetTracker.latestBalance[asset][currency].change.day < 0) ? 'caret-down' : 'circle']} />
                              {assetTracker.latestBalance[asset][currency].change.day.toFixed(2)}%
                            </td>
                          </React.Fragment>
                        ))
                      }
                    </tr>
                    <tr>
                      <th>
                        market price
                      </th>
                      {
                        Object.keys(assetTracker.latestBalance).filter(asset => (asset !== 'total')).map(asset => ( // using latest balance keys in order to filter out quotes for assets we hold no balance for
                          <React.Fragment key={asset}>
                            <td
                              className="text-right"
                              style={{
                                color: colors[asset],
                                width: `${(100 / Object.keys(assetTracker.latestBalance).length / 2)}%`
                              }}>
                              {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(assetTracker.todaysQuotes[asset][currency].close.amount)}
                            </td>
                            <td
                              style={{
                                width: `${(100 / Object.keys(assetTracker.latestBalance).length / 2)}%`,
                                color: (assetTracker.todaysQuotes[asset][currency].change > 0) ? 'green' : (assetTracker.todaysQuotes[asset][currency].change < 0) ? 'red' : 'black'
                              }}>
                              <FontAwesomeIcon icon={["fas", (assetTracker.todaysQuotes[asset][currency].change > 0) ? 'caret-up' : (assetTracker.todaysQuotes[asset][currency].change < 0) ? 'caret-down' : 'circle']} />
                              {assetTracker.todaysQuotes[asset][currency].change.toFixed(2)}%
                            </td>
                          </React.Fragment>
                        ))
                      }
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>price observation</th>
                      {
                        Object.keys(assetTracker.latestBalance).filter(asset => (asset !== 'total')).map(asset => ( // using latest balance keys in order to filter out quotes for assets we hold no balance for
                          <React.Fragment key={asset}>
                            <td colSpan="2" className="text-center" style={{ color: colors[asset] }}>
                              {
                                moment.utc(assetTracker.todaysQuotes[asset][currency].close.time).format('MMMM Do').toLowerCase()
                              } - {
                                moment.utc(assetTracker.todaysQuotes[asset][currency].close.time).format(moment.HTML5_FMT.TIME_SECONDS)
                              } utc
                            </td>
                          </React.Fragment>
                        ))
                      }
                    </tr>
                  </tfoot>
                </Table>
              )
            : (
                <Spinner animation="grow" />
              )
        }
      </Row>
      <Row>
        <Col sm={4}>
          {
            (!!assetTracker && !!assetTracker.latestBalance)
              ? (
                  <ResponsiveContainer width="100%" minHeight="500px">
                    <PieChart>
                      <Pie
                        data={Object.keys(assetTracker.latestBalance).filter(asset => (asset !== 'total')).map(asset => assetTracker.latestBalance[asset][currency])}
                        cx="50%"
                        cy="50%"
                        label={CustomPieLabel}
                        outerRadius={80}
                        dataKey="value">
                        {
                          Object.keys(assetTracker.latestBalance).map(asset => (
                            <Cell
                              key={asset}
                              fill={colors[asset]}
                              asset={asset}
                              currency={currency}
                              balance={assetTracker.latestBalance[asset][currency]} />
                          ))
                        }
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )
              : (
                  <Spinner animation="grow" />
                )
          }
        </Col>
        <Col sm={8}>
          {
            (!!assetTracker && !!assetTracker.balances.length)
              ? (
                  <ResponsiveContainer width="100%" minHeight="500px">
                    <LineChart
                      data={assetTracker.balances.filter(balance => moment(balance.date).isBetween(dateRange.from, dateRange.to))}
                      margin={{ top: 50, right: 10, left: 10, bottom: 10 }} >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={tick => moment(tick).format('MMM D').toLowerCase()} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        tickFormatter={tick => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(tick)} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        strokeDasharray="5 5"
                        tick={{ fontSize: 11 }}
                        tickFormatter={tick => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(tick)} />
                      <Tooltip content={<CustomToolTip />} currency={currency} />
                      <Legend />
                      {
                        assetTracker.assets.map(asset => (
                          <Line yAxisId="left" type="monotone" name={`${asset}`} dataKey={`${asset}.${currency}`} dot={false} stroke={colors[asset] || colors['default']} key={asset} />
                        ))
                      }
                      <Line yAxisId="right" type="monotone" name={`total`} dataKey={`total.${currency}`} strokeDasharray="5 5" dot={false} stroke={colors['total']} />
                    </LineChart>
                  </ResponsiveContainer>
                )
              : (
                  <Spinner animation="grow" />
                )
          }
        </Col>
      </Row>
      <Row>
        <Table striped bordered hover size="sm" style={{margin: '50px 10px 10px 10px'}}>
          <thead>
            <tr>
              <th colSpan="5" className="text-right">
                transaction history
              </th>
            </tr>
            <tr>
              <th>
                date
              </th>
              <th>
                vault
              </th>
              <th>
                note
              </th>
              <th className="text-right">
                asset amount
              </th>
              <th className="text-right">
                {currency} amount
              </th>
            </tr>
          </thead>
          <tbody>
            {
              (!!assetTracker && !!assetTracker.transactions.length)
                ? assetTracker.transactions.filter(transaction => moment(transaction.date).isBetween(dateRange.from, dateRange.to)).map((tx, key) => (
                    <tr key={key}>
                      <td>
                        {tx.date}
                      </td>
                      <td>
                        {tx.vault}
                      </td>
                      <td>
                        {tx.note}
                      </td>
                      <td className="text-right" style={{color: (colors[tx.asset] || colors.default)}}>
                        {tx.asset} {tx.amount}
                      </td>
                      <td className="text-right" style={{color: (colors[tx.asset] || colors.default)}}>
                        {
                          new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(
                            getHistoricalValue(tx.amount, tx.asset, currency, tx.date, assetTracker.quotes)
                          )
                        }
                      </td>
                    </tr>
                  ))
                : null
            }
          </tbody>
        </Table>
      </Row>
      <Row>
        {
          (!!assetTracker && !!assetTracker.balances.length)
            ? (
                <Table striped bordered hover size="sm" style={{margin: '50px 10px 10px 10px'}}>
                  <thead>
                    <tr>
                      <th colSpan={(assetTracker.assets.length + 2)} className="text-right">
                        balance history
                      </th>
                    </tr>
                    <tr>
                      <th>date</th>
                      {
                        assetTracker.assets.map(asset => (
                          <th key={asset} className="text-right">
                            {asset}
                          </th>
                        ))
                      }
                      <th className="text-right">total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      assetTracker.balances.filter(balance => moment(balance.date).isBetween(dateRange.from, dateRange.to)).map((balance) => (
                        <tr key={balance.date}>
                          <th>{balance.date}</th>
                          {
                            assetTracker.assets.map(asset => (
                              <td key={`${balance.date}-${asset}`} className="text-right" style={{color: (colors[asset] || colors.default)}}>
                                <span className="text-muted" style={{marginRight: '1em'}}>
                                  {balance[asset][asset]}
                                </span>
                                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(balance[asset][currency] || 0)}
                              </td>
                            ))
                          }
                          <td className="text-right" style={{color: colors.total}}>
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(balance.total[currency] || 0)}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              )
            : null
        }
      </Row>
    </Container>
  );
}

export default App;
