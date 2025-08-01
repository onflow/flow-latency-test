#!/bin/bash

# Fetch the latest Metamask release info from GitHub
# release_json=$(curl -s https://api.github.com/repos/MetaMask/metamask-extension/releases/latest)
# Fetch a specific release
release_json=$(curl -s https://api.github.com/repos/MetaMask/metamask-extension/releases/tags/v12.18.3)

# Find the asset with a name starting with 'metamask-chrome'
download_url=$(echo "$release_json" | jq -r '.assets[] | select(.name | startswith("metamask-chrome")) | .browser_download_url')

if [ -z "$download_url" ]; then
  echo "No asset found with name starting with 'metamask-chrome'"
  exit 1
fi

echo "Download URL: $download_url"

# Download the zip file
zip_name="metamask-chrome.zip"
curl -L -o "$zip_name" "$download_url"

# Extract to extensions/metamask directory
target_dir="extensions/metamask"
rm -rf "$target_dir"
mkdir -p "$target_dir"
unzip -q "$zip_name" -d "$target_dir"

# Clean up the zip file
rm "$zip_name"

echo "Metamask extension downloaded and extracted to $target_dir"
