-- Seed popularity for common exercises.
-- Normalization: lowercase + remove accents (no other transforms).
WITH normalized AS (
  SELECT
    id,
    lower(
      translate(
        name,
        'ÁÀÂÄÃÅáàâäãåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñÇç',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'
      )
    ) AS normalized_name
  FROM exercise_entity
)
UPDATE exercise_entity
SET popularity = CASE
  WHEN normalized.normalized_name IN (
    'squats',
    'bench press',
    'deadlift',
    'pull-ups',
    'overhead press',
    'barbell row',
    'dips'
  ) THEN 100
  WHEN normalized.normalized_name IN (
    'lunges',
    'leg press',
    'lat pulldown',
    'cable row',
    'incline press',
    'face pulls'
  ) THEN 50
  ELSE 0
END
FROM normalized
WHERE exercise_entity.id = normalized.id;
