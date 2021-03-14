import React, { useState, useEffect } from 'react';

// bootstrap
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

// recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import AssetTracker from './AssetTracker';


function App() {
  const [gistId, setGistId] = useState(undefined);
  const [assetTracker, setAssetTracker] = useState(undefined);
  useEffect(() => {
    setGistId('asdf');
  }, []);
  useEffect(() => {
    if (!!gistId) {
      AssetTracker
        .fromGist(gistId)
        .then(setAssetTracker)
        .catch(console.error);
    }
  }, [gistId]);
  return (
    <Container fluid>
      <Navbar bg="dark" variant="dark">
        <Navbar.Brand href="#home">thgttg</Navbar.Brand>
        <Nav className="mr-auto">
          <Nav.Link href="#about">about</Nav.Link>
        </Nav>
      </Navbar>
      <Row>
        <Col>
          {
            (!!assetTracker && !!assetTracker.balances.length)
              ? (
                  <>
                    <ResponsiveContainer width="100%" minHeight="400px">
                      <LineChart data={assetTracker.balances.filter(b => b.btc > 0)} margin={{ top: 50, right: 10, left: 10, bottom: 10 }} >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="dot" stroke="#82ca9d" />
                        <Line yAxisId="left" type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line yAxisId="right" type="monotone" dataKey="uv" stroke="#82ca9d" />
                      </LineChart>
                    </ResponsiveContainer>
                    <pre>
                      {JSON.stringify(assetTracker.balances, null, 2)}
                    </pre>
                  </>
                )
              : null
          }
        </Col>
      </Row>
      <Row>
        <Col>
          <Table striped bordered hover size="sm" style={{margin: '50px 10px 10px 10px'}}>
            <thead>
              <tr>
                <th>date</th>
                <th>asset</th>
                <th>amount</th>
                <th>note</th>
              </tr>
            </thead>
            <tbody>
              {
                (!!assetTracker && !!assetTracker.transactions.length)
                  ? assetTracker.transactions.reverse().map((tx, key) => (
                      <tr key={key}>
                        <td>
                          {new Intl.DateTimeFormat('en-GB').format(Date.parse(tx.date))}
                        </td>
                        <td>
                          {tx.asset}
                        </td>
                        <td>
                          {tx.amount}
                        </td>
                        <td>
                          {tx.note}
                        </td>
                      </tr>
                    ))
                  : null
              }
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
