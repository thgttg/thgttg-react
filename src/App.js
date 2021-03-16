import React, { useState, useEffect } from 'react';
import BigNumber from "bignumber.js";
import Cookies from 'universal-cookie';
import moment from 'moment';

// bootstrap
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

// recharts
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import AssetTracker from './AssetTracker';

const cookies = new Cookies();
const colors = {
  bch: '#8dc351',
  btc: '#f7931a',
  dash: '#008ce7',
  dot: '#e71081',
  eth: '#444eec',
  ksm: '#8015ab',
  ltc: '#345d9d',
  xlm: '#14b6e7',
  xrp: '#23292f',
  zec: '#ecb244',
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
            payload.filter(x => x.value > 0).map((item) => (
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
          <tr>
            <td>
              total
            </td>
            <td className="text-right">
              {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(payload.reduce((acc, item) => acc + (item.value || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, fill, asset, currency }) => {
  const RADIAN = Math.PI / 180;

  const radiusForValueLabel = innerRadius + (outerRadius - innerRadius) * 1.5;
  const xForValueLabel = cx + radiusForValueLabel * Math.cos(-midAngle * RADIAN);
  const yForValueLabel = cy + radiusForValueLabel * Math.sin(-midAngle * RADIAN);

  const radiusForPercentLabel = innerRadius + (outerRadius - innerRadius) * 0.5;
  const xForPercentLabel = cx + radiusForPercentLabel * Math.cos(-midAngle * RADIAN);
  const yForPercentLabel = cy + radiusForPercentLabel * Math.sin(-midAngle * RADIAN);
  return (
    <>
      <text x={xForValueLabel} y={yForValueLabel} fill={fill} textAnchor={xForValueLabel > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${asset.name} ${asset.value[asset.name]} (${new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(asset.value[currency])})`}
      </text>
      <text x={xForPercentLabel} y={yForPercentLabel} fill="white" textAnchor={xForPercentLabel > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </>
  );
};

function getHistoricalValue(amount, asset, currency, date, quotes) {
  const quote = quotes.find(quote => ((quote.fiat === currency) && (quote.coin === asset) && (quote.date === date.slice(0, 10))));
  return BigNumber(amount).times(BigNumber(quote.open.amount).plus(BigNumber(quote.close.amount)).dividedBy(BigNumber(2))).decimalPlaces(2).toNumber();
}

function App() {
  const [dateRange, setDateRange] = useState({ from: moment('2020-11-11').toISOString().slice(0, 10), to: moment().toISOString().slice(0, 10) });
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
            value={dateRange.from /* todo: figure out why moment removes a day... */}
            onChange={
              (event) => {
                const from = event.target.value;
                if (from.match(/^20[12][0-9]-[01][0-9]-[0123][0-9]$/)) {
                  setDateRange(_dateRange => ({
                    ..._dateRange,
                    from
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
            defaultValue={moment(dateRange.to).toISOString().slice(0, 10)}
            onChange={
              (event) => {
                const to = event.target.value;
                if (to.match(/^20[12][0-9]-[01][0-9]-[0123][0-9]$/)) {
                  setDateRange(_dateRange => ({
                    ..._dateRange,
                    to
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
            disabled={true}
            defaultValue={currency}
            onChange={
              (event) => {
                const currency = event.target.value;
                if (currency.match(/^[a-f]{3}$/)) {
                  setCurrency(currency);
                }
              }
            }>
            <option>eur</option>
            <option>usd</option>
          </Form.Control>
        </Form>
      </Navbar>
      <Row>
        <Col sm={4}>
          {
            (!!assetTracker && !!assetTracker.latestBalance)
              ? (
                  <ResponsiveContainer width="100%" minHeight="500px">
                    <PieChart>
                      <Pie
                        data={assetTracker.latestBalance}
                        cx="50%"
                        cy="50%"
                        label={CustomPieLabel}
                        outerRadius={80}
                        dataKey={`value.${currency}`}>
                        {
                          assetTracker.latestBalance.map((item) => (
                            <Cell key={item.name} fill={colors[item.name]} asset={{ name: item.name, value: { [currency]: item.value[currency], [item.name]: item.value[item.name] } }} currency={currency} />
                          ))
                        }
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )
              : null
          }
        </Col>
        <Col sm={8}>
          {
            (!!assetTracker && !!assetTracker.balances.length)
              ? (
                  <ResponsiveContainer width="100%" minHeight="500px">
                    <LineChart
                      data={assetTracker.balances.filter(balance => moment(balance.date).isBetween(moment(dateRange.from), moment(dateRange.to)))}
                      margin={{ top: 50, right: 10, left: 10, bottom: 10 }} >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={tick => moment(tick).format('MMM D').toLowerCase()} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={tick => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(tick)} />
                      <Tooltip content={<CustomToolTip />} currency={currency} />
                      <Legend />
                      {
                        assetTracker.assets.map(asset => (
                          <Line type="monotone" name={`${asset}`} dataKey={`${asset}.${currency}`} dot={false} stroke={colors[asset] || colors['default']} key={asset} />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                )
              : null
          }
        </Col>
      </Row>
      <Row>
        <Table striped bordered hover size="sm" style={{margin: '50px 10px 10px 10px'}}>
          <thead>
            <tr>
              <th colSpan="4" className="text-right">
                transaction history
              </th>
            </tr>
            <tr>
              <th>
                date
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
                ? assetTracker.transactions.filter(transaction => moment(transaction.date).isBetween(moment(dateRange.from), moment(dateRange.to))).map((tx, key) => (
                    <tr key={key}>
                      <td>
                        {tx.date}
                      </td>
                      <td>
                        {tx.note}
                      </td>
                      <td className="text-right">
                        {tx.asset} {tx.amount}
                      </td>
                      <td className="text-right">
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
                      assetTracker.balances.filter(balance => moment(balance.date).isBetween(moment(dateRange.from), moment(dateRange.to))).map((balance) => (
                        <tr key={balance.date}>
                          <th>{balance.date}</th>
                          {
                            assetTracker.assets.map(asset => (
                              <td key={`${balance.date}-${asset}`} className="text-right">
                                <span className="text-muted" style={{marginRight: '1em'}}>
                                  {balance[asset][asset]}
                                </span>
                                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(balance[asset][currency] || 0)}
                              </td>
                            ))
                          }
                          <td className="text-right">
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(assetTracker.assets.reduce((acc, asset) => acc + (balance[asset][currency] || 0), 0))}
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
