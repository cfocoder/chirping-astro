---
title: 'Guide to YAML'
description: 'YAML is a data serialization language, which is very easy for a human to understand and is widely used in the configuration files of different applications.'
pubDate: 2022-09-30
heroImage: '/images/2023/08/YAML.png'
heroImageAlt: 'YAML'
categories: ['Cloud']
tags: []
toc: true
---

YAML is a data serialization language, which is very easy for a human to understand and is widely used in the configuration files of different applications.

YAML stands for **“YAML Ain’t Markup Language”**, although in a course I took they mentioned that maybe at one time it meant **“Yet Another Markup Language”**.

YAML It is very similar to JSON and XML, only with a syntax that is much easier to visualize and understandable for humans. It’s so easy to read, it even allows the use of comments.

A YAML file is simply a text file with a **.yml** or **.yaml** extension.

Hierarchy in YAML is similar to Python code, in that it uses indentation and double spaces.

Basically, each line follows the format **“Key-Value Pair”**, the word to the left of the colon is the key, and the part to the right of the colon is the value.

```yaml
firstname: Hector
lastname: Sanchez
pets:
  - Dog:
      - Candy
      - Daisy
  - Cat:
      - Micho
      - Bruce
myDate: !!timestamp 2022-02-02
locations: [guadalajara, zapopan, ocotlan]

# This is a comment
```

“—” 3 hyphens are used to start or separate a YAML code sequence, so you can have multiple configurations in the same file, as long as they are separated by three hyphens at the beginning.

A list of items can be separated by commas in square brackets, or by single hyphens below the container.

In the case of dates, so that it does not take them as text, two exclamation marks must be used at the beginning of the word “timestamp”.

For comments, only the “#” symbol is used.

To validate the code, we can use the website [YAMLlint.com](http://www.yamllint.com/) which lets us know if the code is correct or not

![](/images/2023/08/YAMLlint.png)
