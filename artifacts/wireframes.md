---
title: Wireframes
last-updated: 2026-07-18
---

# Wireframes

## 1. As a visitor, I want to create an account, so that I can use the application.

```
┌─────────────────────────────┐
│ [Create account] or [Log In]│
└─────────────────────────────┘
```

```
┌─────────────────────────────┐
│  Account Creation           │
├─────────────────────────────┤
│  email: _____               │
│  username: _____            │
│  password: _______          │
│                             │
│  [Create account]           │
└─────────────────────────────┘
```

## 2. As a visitor, I want to log into an existing account, so that I can access my data.

```
┌─────────────────────────────┐
│  Log in                     │
├─────────────────────────────┤
│  email or username: _____   │
│  password: _______          │
│                             │
│  [Log in]                   │
└─────────────────────────────┘
```

## 3. As a user, I want to see an overview of my log types when I log in, so that I have a starting point to navigate from.

```
┌──────────────────────────────┐
│  Dashboard          [Profile]│
├──────────────────────────────┤
│  My Log Types          [+]   │
│  ──────────────────────────  │
│  [Books]               [Add] │
│  [Workouts]            [Add] │
└──────────────────────────────┘
```

## 4. As a user, I want to define an item-type to log, so that I can track something specific to me.

```
┌───────────────────────────────────────────────────┐
│  Create Log Type                    [Profile]     │
├───────────────────────────────────────────────────┤
│  Name: _______                                    │
│  field1: _____   field1Type: ____   required: [ ] │
│  field2: _____   field2Type: ____   required: [x] │
│  ...                                              │
│                                                   │
│  [Add type]                                       │
└───────────────────────────────────────────────────┘
```

## 5. As a user, I want to create an entry, so that I can track myself.

```
┌──────────────────────────────────────┐
│  Create Log Entry        [Profile]   │
├──────────────────────────────────────┤
│  Log type: [LogType]                 │
│  field1: _____                       │
│  field2: _____                       │
│  ...                                 │
│                                      │
│  [Add entry]                         │
└──────────────────────────────────────┘
```

## 6. As a user, I want to view my individual entries, so that I recall information.

```
┌────────────────────────────────────────────────┐
│  My Log Entries                    [Profile]   │
├────────────────────────────────────────────────┤
│  [Sorted]                                      │
│  ┌────────────────────────────────────────┐    │
│  │  field1 │ date   │ ... │ Edit │ Delete │    │
│  ├────────────────────────────────────────┤    │
│  │  value1 │ value5 │     │ [E]  │  [D]   │    │
│  │  value1 │ value4 │     │ [E]  │  [D]   │    │
│  │  value1 │ value2 │     │ [E]  │  [D]   │    │
│  │  value1 │ value1 │     │ [E]  │  [D]   │    │
│  └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

## 7. As a user, I want to edit an entry, so that I can correct it or add more information.

```
┌──────────────────────────────────────┐
│  Edit Log Entry           [Profile]  │
├──────────────────────────────────────┤
│  Log type: [LogType]                 │
│  field1: value1                      │
│  field2: value2                      │
│  ...                                 │
│                                      │
│  [Save]                              │
└──────────────────────────────────────┘
```

## 8. As a user, I want to delete an entry, so that it's no longer part of my timeline.

```
┌─────────────────────────────────┐
│  Delete this entry?             │
├─────────────────────────────────┤
│  This action cannot be undone.  │
│                                 │
│  [Cancel]           [Delete]    │
└─────────────────────────────────┘
```
