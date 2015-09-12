## Synopsis

Discovering CS is an open-source introductory-level computer
engineering online textbook, all in one handy NodeJS app!  

The content of the text is arranged in a top-down fashion, starting
with the high-level systems that students will have encountered in
day-to-day life and then examining how these are programmed, what ISA
operations they involve, what circuitry executes these ISA operations,
and finally how digital logic circuitry is actually fabricated.

It includes many interactive elements, including in-browser Python and
AVR ISA simulators, a binary calculator, and even a framework for
online homework submission.

## Setup

To get started, simply clone this repositry, navigate to the home
directory, and run:

```
node app.js
```

which will start up a server on `localhost:61453`

## Deploying

One mechanism for deploying the textbook for use in a class is with
Docker, starting with a Dockerfile like:

```
FROM ubuntu:latest
RUN apt-get update
RUN apt-get -y upgrade
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm
EXPOSE 61453
ADD src /tmp/
ADD start.sh /tmp/
RUN chmod +x /tmp/start.sh
CMD . /tmp/start.sh
```

where `start.sh` looks like:

```
cd /tmp/
npm install
nodejs app.js
```

The container can then be built with:

```
docker build -t discoveringcs .
docker run -p 61453:61453 discoveringcs
```

## Table of Contents

### 1: Introduction

Chapter 1 introduces the course as a whole, starting with a precise
definition of what we mean by the word "computer". This will be a
relatively simple notion, and the course will revolve around two
separate questions:

1. How can we program a computer?
2. How can we build a computer?

The first question will be addressed in chapters 2–6, and the second
in chapters 7–8.

### 2: Programming

Chapter 2 starts in on the study of programming. Programming occurs in
two steps: When we come up against a problem, the first step is to
describe a precise sequence of steps that will solve it. Such a set of
steps, written in English (or human language of choice) is called an
algorithm, and is the focus of section 2.2.

Once we have an algorithm, the second step is to rewrite that
algorithm not in human language, but in a computer-understandable
language. This will be the program. In section 2.3, we introduce a
particular programming language--a simplified version of Python--to
illustrate this process.

### 3: Advanced Programming

In chapter 2, we learned a simple subset of the Python programming
language. Its simplicity made it easier to explain, but hard to use
for any complicated or interesting tasks. Chapter 3 is devoted to
expanding our knowledge of Python so we can work toward programs that
actually behave like software as we know it in the real world.

### 4: Numbers in Computer Science

Chapter 4 is a brief digression: As we descend to the level of the
computer hardware, we are going to need a new language to talk about
numbers as a computer understands them. This is accomplished by using
binary representations for numbers, as is explained in chapter 4.

### 5: ISA

In chapters 2 and 3, we learned our first programming language. This
language is not understood or used directly by the computer. Instead,
the computer understands a much more basic language, called the ISA,
and our programs from chapters 2 and 3 had to be translated to this
basic language before being run by the computer.

To truly understand what a computer does under the hood, we need to
learn to work with the ISA directly, which is the goal of chapter
5. This happens in two parts: We learn what the main components inside
the computer are (that is, the computer's "architecture"), and then we
learn what instructions the computer itself natively understands for
manipulating these components (that is, the computer's "instruction
set").

### 6: Encodings and the ISA

Chapter 5 is another brief but fun digression to address the question
of, now that we know that the computer deals in numbers, how is it
that we can manipulate things like text and images using computers as
well? The answer is that everything that a computer with, from text to
images to the ISA instructions themselves, must actually be numbers
behind the scenes. The schemes by which numbers are made to correspond
to text or to graphical data or to instructions are called encodings,
and we explore several different types of encoding in this chapter.

### 7: Microarchitecture

Chapter 7 switches to the second question of "How to build a
computer". Since we now understand the ISA, we can do this by taking
the major tasks that the various ISA instructions need to be able to
accomplish, imagining we have some black-box circuit components that
perform these tasks, and examining how the circuit components can be
connected to create an actual machine that accomplishes the ISA
tasks--that is, a computer!

### 8: Digital Logic and Transistors

Once we have in hand a list of the circuit components we need to build
a machine capable of executing ISA instructions, all that remains is
to build these components. To do this, we examine in chapter 8 the
building blocks of digital circuits: Logic gates and, ultimately,
transistors.

## License

Unless otherwise indicated, all work in this text is licensed under
the Creative Commons Attribution, Non-Commercial, Share-Alike 4.0
International license.