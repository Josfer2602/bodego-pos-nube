#!/bin/bash
systemctl restart backend
systemctl restart nginx
certbot --nginx -d vendeya.testwebapps.de -d www.vendeya.testwebapps.de --non-interactive --agree-tos -m admin@vendeya.testwebapps.de --redirect
