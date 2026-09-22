import { and, eq } from "drizzle-orm";
import { ATP_SYLLABUS, ATP_UNITS, STARTER_FLASHCARDS } from "./atp-catalog.js";
import { createDatabase } from "./client.js";
import { databaseUrl } from "./database-url.js";
import { flashcards, mindMapNodes, questions, subjects, topics } from "./schema.js";

const database = createDatabase(databaseUrl(), 1);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

try {
  for (const unit of ATP_UNITS) {
    const [subject] = await database.db.insert(subjects).values({
      slug: unit.slug,
      unitCode: unit.unitCode,
      name: unit.name,
      description: "",
      position: unit.position,
      published: true,
    }).onConflictDoUpdate({
      target: subjects.slug,
      set: {
        unitCode: unit.unitCode,
        name: unit.name,
        description: "",
        position: unit.position,
        published: true,
      },
    }).returning();

    if (!subject) throw new Error(`Failed to seed ${unit.unitCode}`);

    const syllabus = ATP_SYLLABUS.filter((entry) => entry.unitCode === unit.unitCode);
    const topicNames = [...new Set(syllabus.map((entry) => entry.topic))];
    const topicByName = new Map<string, typeof topics.$inferSelect>();

    for (const [index, name] of topicNames.entries()) {
      const slug = slugify(name) || `topic-${index + 1}`;
      const [topic] = await database.db.insert(topics).values({
        subjectId: subject.id,
        slug,
        name,
        description: "",
        position: index + 1,
        published: true,
      }).onConflictDoUpdate({
        target: [topics.subjectId, topics.slug],
        set: { name, description: "", position: index + 1, published: true },
      }).returning();
      if (topic) topicByName.set(name, topic);
    }

    await database.db.delete(mindMapNodes).where(eq(mindMapNodes.subjectId, subject.id));
    let position = 0;
    const rootKey = unit.unitCode;
    const nodes: Array<typeof mindMapNodes.$inferInsert> = [{
      subjectId: subject.id,
      key: rootKey,
      parentKey: null,
      label: unit.name,
      kind: "unit",
      depth: 0,
      position: position++,
      published: true,
    }];

    for (const name of topicNames) {
      const topicKey = `${unit.unitCode}:topic:${slugify(name)}`;
      nodes.push({
        subjectId: subject.id,
        key: topicKey,
        parentKey: rootKey,
        label: name,
        kind: "topic",
        depth: 1,
        position: position++,
        published: true,
      });

      const issueLabels = [...new Set(
        syllabus
          .filter((entry) => entry.topic === name)
          .flatMap((entry) => [...entry.issues]),
      )];

      for (const [issueIndex, label] of issueLabels.entries()) {
        nodes.push({
          subjectId: subject.id,
          key: `${topicKey}:issue:${slugify(label)}:${issueIndex + 1}`,
          parentKey: topicKey,
          label,
          kind: "issue",
          depth: 2,
          position: position++,
          published: true,
        });
      }
    }

    if (nodes.length) await database.db.insert(mindMapNodes).values(nodes);

    const unitCards = STARTER_FLASHCARDS.filter((card) => card.unitCode === unit.unitCode);
    const positionByTopic = new Map<string, number>();
    for (const card of unitCards) {
      const cardTopicSlug = `cards-${slugify(card.topic)}`;
      let [topic] = await database.db.select().from(topics).where(and(
        eq(topics.subjectId, subject.id),
        eq(topics.slug, cardTopicSlug),
      )).limit(1);
      if (!topic) {
        [topic] = await database.db.insert(topics).values({
          subjectId: subject.id,
          slug: cardTopicSlug,
          name: card.topic,
          description: "",
          position: topicNames.length + positionByTopic.size + 1,
          published: true,
        }).returning();
      }
      if (!topic) throw new Error(`Failed to seed card topic for ${card.topic}`);
      const cardPosition = (positionByTopic.get(topic.id) ?? 0) + 1;
      positionByTopic.set(topic.id, cardPosition);
      await database.db.insert(flashcards).values({
        topicId: topic.id,
        front: card.front,
        back: card.back,
        source: card.source,
        position: cardPosition,
        published: true,
      }).onConflictDoUpdate({
        target: [flashcards.topicId, flashcards.position],
        set: {
          front: card.front,
          back: card.back,
          source: card.source,
          published: true,
        },
      });
    }
  }

  const [civil] = await database.db.select().from(subjects).where(eq(subjects.slug, "civil-litigation")).limit(1);
  if (civil) {
    let [practiceTopic] = await database.db.select().from(topics).where(and(
      eq(topics.subjectId, civil.id),
      eq(topics.slug, "civil-procedure-foundations"),
    )).limit(1);
    if (!practiceTopic) {
      [practiceTopic] = await database.db.insert(topics).values({
        subjectId: civil.id,
        slug: "civil-procedure-foundations",
        name: "Civil Procedure Foundations",
        description: "",
        position: 999,
        published: true,
      }).returning();
    }

    if (practiceTopic) {
      const existing = await database.db.select({ id: questions.id }).from(questions)
        .where(eq(questions.topicId, practiceTopic.id));
      if (existing.length === 0) {
        await database.db.insert(questions).values([
          {
            topicId: practiceTopic.id,
            prompt: "Which doctrine prevents a court from retrying a matter already finally decided between the same parties by a competent court?",
            options: [
              { id: "a", text: "Res judicata" },
              { id: "b", text: "Sub judice" },
              { id: "c", text: "Estoppel by conduct" },
              { id: "d", text: "Forum non conveniens" },
            ],
            correctOptionId: "a",
            explanation: "Section 7 of the Civil Procedure Act codifies res judicata.",
            difficulty: "standard",
            published: true,
          },
          {
            topicId: practiceTopic.id,
            prompt: "Under Order 42 rule 6, which requirement is part of an application for stay of execution pending appeal?",
            options: [
              { id: "a", text: "Security for due performance" },
              { id: "b", text: "Automatic stay after filing a notice of appeal" },
              { id: "c", text: "Consent of the decree-holder" },
              { id: "d", text: "Proof that the appeal must succeed" },
            ],
            correctOptionId: "a",
            explanation: "The applicant must satisfy the stay requirements, including security for due performance.",
            difficulty: "standard",
            published: true,
          },
        ]);
      }
    }
  }

  console.log(`Seeded ${ATP_UNITS.length} ATP units, ${ATP_SYLLABUS.length} syllabus nodes, mind maps, and ${STARTER_FLASHCARDS.length} flashcards.`);
} finally {
  await database.close();
}
