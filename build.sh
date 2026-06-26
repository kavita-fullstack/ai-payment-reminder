#!/usr/bin/env bash

set -e

echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Building React..."
npm run build

cd ../backend

echo "Installing backend dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt