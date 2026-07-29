const { inquiry } = require('./controllers/inquiry.controller');
const mongoose = require("mongoose");
const express = require('express');

const req = {
    query: {},
    body: { angCode: "26007" }
};
const res = {
    status: (code) => ({
        json: (data) => {
            console.log("Status:", code);
            console.log("Data:", data);
        }
    }),
    json: (data) => {
        console.log("Status: 200");
        console.log("Data:", data);
    }
};

async function run() {
    await inquiry(req, res);
}
run();
