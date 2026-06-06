---
title: "Cypher Quick Reference Guide"
description: "A comprehensive quick reference for Cypher, the query language for graph databases. This guide focuses on Cypher syntax and patterns that work across Neo4j, Kuzu, and other graph databases supporting Cypher."
pubDate: 2025-12-28
categories: ["Data Science"]
tags: []
toc: true
---

A comprehensive quick reference for Cypher, the query language for graph databases. This guide focuses on Cypher syntax and patterns that work across Neo4j, Kuzu, and other graph databases supporting Cypher.

## For SQL Developers: How Cypher Relates to SQL

If you’re coming from a SQL background, you’ll find Cypher surprisingly familiar. Both are declarative query languages, but they’re optimized for different data models:

**Key Similarities:**

- MATCH is like SELECT – it retrieves data

- WHERE works exactly the same for filtering

- RETURN is like SELECT in SQL – it projects what to return

- CREATE is like INSERT – adds new data

- DELETE is like DELETE – removes data

- Aggregations (count, sum, avg) work similarly

- WITH is like subqueries or CTEs (Common Table Expressions)

**Key Differences:**

- Instead of tables and rows, you work with nodes and relationships

- Pattern matching replaces JOINs: (a)-[:REL]->(b) instead of FROM table1 JOIN table2

- Relationships are first-class citizens with types and directions

- No need for foreign keys – relationships are explicit

Think of Cypher as SQL for graphs, where you describe the shape of the data you want rather than how to join tables.

## Table of Contents

- Basic Concepts

- Node Patterns

- Relationship Patterns

- CREATE

- MATCH

- MERGE

- WHERE

- RETURN

- WITH

- PATHS

- CALL and Procedures

- DELETE and DETACH

- Aggregations

- Indexes and Constraints

- Common Patterns

- Kuzu vs Neo4j Notes

## Basic Concepts

### Graph Structure

- Nodes: Entities (vertices) with labels and properties

- Relationships: Connections between nodes with types and properties

- Properties: Key-value pairs on nodes and relationships

### Syntax Basics

- MATCH, CREATE, MERGE, WHERE, RETURN, WITH are case-insensitive

- Strings: 'single quotes' or "double quotes"

- Comments: // single line or /* multi-line */

- Variables: case-sensitive, start with letter or underscore

## Node Patterns

```text
// Basic node pattern
(n)                    // Any node
(n:Person)             // Node with label Person
(n:Person {name: 'Alice'})  // Node with label and properties
(p:Person:Employee)    // Node with multiple labels
```

## Relationship Patterns

```text
// Directed relationships
()-[]->()              // Any relationship, directed
()-[:KNOWS]->()        // Specific relationship type
()-[:KNOWS|FRIENDS]->() // Multiple relationship types
()-[:KNOWS*1..3]->()   // Variable length (1 to 3 hops)

// Undirected relationships
()-[]-()               // Any relationship, undirected
()-[:KNOWS]-()         // Specific type, undirected

// Relationship with properties
()-[:KNOWS {since: 2020}]->()
()-[r:KNOWS]->()       // Capture relationship as variable
```

## CREATE

**Purpose**: Creates new nodes and/or relationships in the graph. Unlike MERGE, CREATE always creates new elements, even if they already exist.

```sql
// Create a simple node
CREATE (n:Person {name: 'Alice', age: 30})

// Create multiple nodes
CREATE 
  (p1:Person {name: 'Alice'}),
  (p2:Person {name: 'Bob'})

// Create nodes and relationship
CREATE 
  (a:Person {name: 'Alice'}),
  (b:Person {name: 'Bob'}),
  (a)-[:KNOWS {since: 2020}]->(b)

// Create with path
CREATE p = (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
RETURN p
```

## MATCH

**Purpose**: Finds and matches patterns in the graph. It’s the most common clause for querying data.

```text
// Match all nodes
MATCH (n) RETURN n

// Match specific label
MATCH (p:Person) RETURN p.name, p.age

// Match with relationship
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name

// Match with variable length
MATCH (a:Person)-[:KNOWS*1..2]->(b:Person)
RETURN a.name, b.name

// Match with relationship variable
MATCH (a)-[r:KNOWS]->(b)
RETURN type(r), properties(r)

// Optional match
OPTIONAL MATCH (p:Person)-[:HAS_PET]->(pet)
RETURN p.name, pet.name
```

## MERGE

**Purpose**: Ensures existence – creates if not found, matches if exists. Like CREATE + MATCH combined. Prevents duplicates.

```text
// MERGE ensures existence (like CREATE or MATCH)
MERGE (p:Person {name: 'Alice'})
ON CREATE SET p.age = 30, p.created = timestamp()
ON MATCH SET p.lastSeen = timestamp()

// MERGE with relationships
MERGE (a:Person {name: 'Alice'})
MERGE (b:Person {name: 'Bob'})
MERGE (a)-[:KNOWS]->(b)

// MERGE with path
MERGE p = (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
ON CREATE SET p.created = timestamp()
```

## WHERE

**Purpose**: Filters results based on conditions. Works with MATCH, CALL, and other clauses.

```text
// Basic filtering
MATCH (p:Person)
WHERE p.age > 25
RETURN p.name

// Multiple conditions
MATCH (p:Person)
WHERE p.age > 25 AND p.city = 'New York'
RETURN p.name

// String operations
MATCH (p:Person)
WHERE p.name STARTS WITH 'A'
RETURN p.name

// Pattern in WHERE
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:HAS_FRIEND]->(friend)
  WHERE friend.age > 30
}
RETURN p.name

// Comparison with list
MATCH (p:Person)
WHERE p.age IN [25, 30, 35]
RETURN p.name
```

## RETURN

**Purpose**: Specifies what data to return from the query. Projects and formats the final result.

```text
// Basic return
MATCH (p:Person)
RETURN p.name, p.age

// Return all
MATCH (p:Person)
RETURN p

// Return with alias
MATCH (p:Person)
RETURN p.name AS fullName, p.age AS years

// Return with calculations
MATCH (p:Person)
RETURN p.name, p.age + 5 AS futureAge

// Return distinct
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN DISTINCT p.name, friend.name

// Limit results
MATCH (p:Person)
RETURN p.name
LIMIT 10

// Order results
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC
```

## WITH

**Purpose**: Passes results from one part of the query to the next. Enables aggregation and chaining of complex queries.

```sql
// Pass results to next step
MATCH (p:Person)-[:KNOWS]->(friend)
WITH p, count(friend) AS friendCount
WHERE friendCount > 5
RETURN p.name, friendCount

// Aggregate and continue
MATCH (p:Person)-[:HAS_ORDER]->(o:Order)
WITH p, sum(o.amount) AS totalSpent
WHERE totalSpent > 1000
MATCH (p)-[:HAS_FRIEND]->(friend)
RETURN p.name, totalSpent, count(friend) AS friends

// Multiple WITH clauses
MATCH (p:Person)-[:HAS_POST]->(post:Post)
WITH p, count(post) AS postCount
WITH p, postCount, postCount * 2 AS doubled
WHERE doubled > 10
RETURN p.name, postCount, doubled
```

## PATHS

**Purpose**: Captures and manipulates entire paths (sequences of nodes and relationships) for complex traversals.

```text
// Capture entire path
MATCH p = (a:Person)-[:KNOWS*1..3]->(b:Person)
RETURN p

// Path functions
MATCH p = (a:Person)-[:KNOWS]->(b:Person)
RETURN nodes(p), relationships(p)

// Shortest path
MATCH p = shortestPath((a:Person)-[:KNOWS*]-(b:Person))
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN p

// All shortest paths
MATCH p = allShortestPaths((a:Person)-[:KNOWS*]-(b:Person))
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN p

// Path length
MATCH p = (a:Person)-[:KNOWS*]->(b:Person)
WHERE length(p) > 2
RETURN a.name, b.name, length(p) AS pathLength

// Extract from path
MATCH p = (a:Person)-[:KNOWS]->(b:Person)-[:WORKS_AT]->(c:Company)
RETURN a.name, b.name, c.name, 
       [node in nodes(p) | node.name] AS nodeNames
```

## CALL and Procedures

**Purpose**: Executes procedures (predefined functions) to perform operations beyond standard Cypher. Used for system functions, data import, algorithms, etc.

```sql
// CALL with built-in procedures
CALL db.info() YIELD version, edition
RETURN version, edition

// CALL with parameters
CALL db.awaitIndex(':Person(name)', 30) YIELD value
RETURN value

// CALL with subquery (Neo4j 4.x+)
CALL {
  MATCH (p:Person)
  WHERE p.age > 30
  RETURN count(p) AS olderThan30
}
RETURN olderThan30

// CALL with apoc procedures (Neo4j only)
CALL apoc.load.json('https://api.example.com/data')
YIELD value
CREATE (n:Node {data: value})

// CALL with aggregation
MATCH (p:Person)
CALL {
  WITH p
  MATCH (p)-[:KNOWS]->(friend)
  RETURN count(friend) AS friendCount
}
RETURN p.name, friendCount

// CALL with YIELD and WHERE
CALL db.propertyKeys() YIELD propertyKey
WHERE propertyKey STARTS WITH 'name'
RETURN propertyKey

// CALL with multiple YIELD
CALL db.labels() YIELD label
WITH label
CALL db.indexes() YIELD indexName, properties
WHERE label IN properties
RETURN label, indexName, properties
```

## DELETE and DETACH

**Purpose**: Removes nodes and relationships from the graph. DELETE removes only if no relationships exist, DETACH removes relationships along with nodes.

```sql
// Delete nodes (only if no relationships exist)
MATCH (p:Person {name: 'Alice'})
DELETE p

// Detach delete nodes (removes relationships too)
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p

// Delete specific relationships
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
DELETE r

// Detach delete all relationships of a node
MATCH (p:Person {name: 'Alice'})-[r]-()
DELETE r

// Delete with pattern
MATCH (p:Person {name: 'Alice'})-[r:KNOWS]-()
DETACH DELETE p, r

// Remove properties (not delete)
MATCH (p:Person {name: 'Alice'})
REMOVE p.tempProperty

// Remove labels
MATCH (p:Person {name: 'Alice'})
REMOVE p:Person
```

## Aggregations

```text
// Count
MATCH (p:Person)
RETURN count(p) AS totalPeople

// Count distinct
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, count(DISTINCT friend) AS uniqueFriends

// Sum, avg, min, max
MATCH (p:Person)
RETURN sum(p.age) AS totalAge, 
       avg(p.age) AS averageAge,
       min(p.age) AS youngest,
       max(p.age) AS oldest

// Collect
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, collect(friend.name) AS friends

// Aggregation with conditions
MATCH (p:Person)
RETURN 
  count(CASE WHEN p.age = 30 THEN 1 END) AS mature
```

## Indexes and Constraints

```sql
// Create index
CREATE INDEX person_name_index FOR (p:Person) ON (p.name)

// Create unique constraint
CREATE CONSTRAINT person_name_unique FOR (p:Person) REQUIRE p.name IS UNIQUE

// Create node key constraint
CREATE CONSTRAINT person_node_key FOR (p:Person) REQUIRE (p.name, p.email) IS NODE KEY

// Show indexes
SHOW INDEXES

// Show constraints
SHOW CONSTRAINTS

// Drop index
DROP INDEX person_name_index

// Drop constraint
DROP CONSTRAINT person_name_unique
```

## Common Patterns

```sql
// Find mutual friends
MATCH (a:Person)-[:KNOWS]->(mutual:Person)(f)
)

// Using CALL with aggregation
MATCH (p:Person)
CALL {
  WITH p
  MATCH (p)-[:KNOWS]->(friend)
  RETURN count(friend) AS friendCount
}
RETURN p.name, friendCount

// CALL with apoc procedures (Neo4j only)
CALL apoc.load.json('https://api.example.com/data')
YIELD value
CREATE (n:Node {data: value})

// CALL with db procedures
CALL db.propertyKeys() YIELD propertyKey
RETURN collect(propertyKey) AS allProperties
```

## Kuzu vs Neo4j Notes

### Kuzu Advantages

- Embedded: No server required, runs in-process

- Performance: Optimized for analytical queries

- Simplicity: Easier setup and deployment

- Memory efficient: Better for large graphs on limited resources

### Neo4j Advantages

- APOC Library: Extensive procedures for data import, graph algorithms, etc.

- Bloom: Visual query builder

- Enterprise features: Clustering, security, monitoring

- Larger ecosystem: More tools and integrations

### APOC Equivalent in Kuzu

Kuzu doesn’t have APOC, but provides:

- Built-in functions for common operations

- Python/C++ API for custom extensions

- Regular updates with new features

### Migration Considerations

- Most basic Cypher works in both

- APOC procedures need custom implementation in Kuzu

- Kuzu focuses on analytical queries

- Neo4j better for transactional workloads

## Quick Tips

- Always use labels for better performance

- Use parameters in applications: CREATE (p:Person {name: \$name})

- Profile queries: PROFILE MATCH... to optimize

- Use indexes for frequently queried properties

- MERGE over CREATE when you want to avoid duplicates

- WITH for chaining complex queries

- Path variables for complex traversals

## Resources

- Cypher Reference Manual

- Kuzu Documentation

- Cypher Cheatsheet
