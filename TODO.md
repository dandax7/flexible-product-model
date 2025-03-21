Design choices - and things to improve

# 1. Service vs Data oriented design

Systems can be deisgned with API first, or Data first approach.

Theory:

In API first approach, API's and services drive the design, and all systems iteract via these APIs.
The database is just one of the choices of data persistence for the API services, and is
and implementation detail, and often different for each service. The data is not directly
accessible without the API (at least in good practice)

In Data first approach, databases are the center of data persistence, and there is
referential integrity between tables and databases (at least in good practice). Data can be
accessed via API or other methods, can be fixed without development etc..

Implementation:
This project takes Data first approach. Data schema is normalized, and API uses predefined 
SQL queries to access the data.

# 2. Caching

There is no caching in the system except for the attributes dictionary. To promote efficient
and consistent attributes, the attribute map (each attribute is mapped to an ID), is cached
in the server memory. It uses eventual consitency with a 10 second timeout, and can be overriden.

Design assumes that the dictionary of all attributes doesn't change often.

# 3. Case insensitivity

The system is designed to NOT be case sensitive, so a sku of "ABC-123" is same as "abc-123" for
all searching purposes. It does retain case on insert. This is enforced in the database.

# 4. Product grouping

Since many SKU's are related, and are just different varieties of the same product, there's
an additional grouping that's eforsed via 'Product ID'. Just like amazon will have a page
for a single product with various SKU's for their sizes and colors, the 'Product ID' is
what groups these SKU's together. The product also shares common attributes like the product
name, which is shared by all of it's SKU's (but each SKU adds attributes to the name)

# 5. Code organization

## Splits

Ideally the code should be split up more. We need repository classes to deal with the
database specifics, and controller classes to deal with HTTP requests and responses.

## Unit tests

Currently only system tests exist, unit tests with mocks should be added to code
to run at compile time.

# 6. Permissioning

there is no auth in this version

# 7. Swagger

there is no swagger, only postman or curl access to the APIs

# 8. Regrets

Attributes management is messy and overly complex. It's might be premature performance optimization.

Storing it as a JSON for every SKU in a JSOB column is a lot simpler, and performance could be
mitigated via GIN search. If attributes change often, and GIN search is performant, this would be much
better.


