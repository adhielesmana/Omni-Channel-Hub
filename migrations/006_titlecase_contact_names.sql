UPDATE contacts
SET name = initcap(name)
WHERE name IS NOT NULL AND name != initcap(name);
