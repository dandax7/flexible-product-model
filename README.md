# flexible-product-model

How to run


Installing postgress, npm and curl is beyond the scope of this readme
Please refer to:
    https://www.postgresql.org/download/
    https://docs.npmjs.com/downloading-and-installing-node-js-and-npm


Check these two commands to make sure they're installed:
    node -v                   # check the node version
    npm -v                    # check the npm version
    psql -V                   # check the postgress version
    curl -V                   # check the curl version

*In windows curl should live in C:\Windows\System32*

Step 1: clone the git repo
# git clone git@github.com:dandax7/flexible-product-model.git
# cd flexible-product-model

Step 2: Create the database (called inventory)
# psql -f schema/from_scratch.psql
Seed the database
# psql -f schema/seed_data.psql

Step 3: Run server
*It might help to run this in a new window*
cd to where git repo was cloned
create a file api/.env with a single line:

    INVENTORY_DB="postgresql://localhost:5432/inventory"

Note, if your postgress is not installed locally, on default port, or with an alternate user/password, the url should be changed. It has a full format of:

    postgresql://username:password@host:port/inventory"

Run the server:
# cd api
# npm install
# npm run dev

It should print:
🚀 Server running on http://localhost:3000

Step 4: Run tests
*In the original window*
# cd tests
# ./