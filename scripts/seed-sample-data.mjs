import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSampleData() {
  try {
    console.log('🌱 Starting to seed sample data...');

    // Create sample students
    console.log('\n👥 Creating sample students...');
    
    const students = [
      {
        displayName: 'Emma van der Berg',
        pinHash: '$2a$10$rQZ8K9mN2pL3sT4uV5wX6yA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9zA',
      },
      {
        displayName: 'Lucas de Vries',
        pinHash: '$2a$10$sRZ9L0nO3qM4tT5vW6xY7zB8cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ0aB',
      },
      {
        displayName: 'Sophie Bakker',
        pinHash: '$2a$10$tSZ0M1oP4rN5uU6wX7yZ8aC9dE0fG1hH2iJ3kL4mN5oP6qR7sT8uV9wX0yZ1aB2c',
      },
      {
        displayName: 'Noah Janssen',
        pinHash: '$2a$10$uTA1N2pQ5sO6vV7xY8zA9bD0eF1gG2hH3iJ4kL5mN6oP7qR8sT9uV0wX1yZ2aB3cD',
      },
      {
        displayName: 'Lieke Visser',
        pinHash: '$2a$10$vUB2O3qR6tP7wW8yZ9aB0cE1fF2gG3hH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4cD5e',
      }
    ];

    const createdStudents = [];
    for (const studentData of students) {
      const student = await prisma.student.upsert({
        where: { displayName: studentData.displayName },
        update: {},
        create: studentData,
      });
      createdStudents.push(student);
      console.log(`   ✅ Created student: ${student.displayName} (ID: ${student.id})`);
    }

    // Create sample notes
    console.log('\n📝 Creating sample notes...');
    
    const sampleNotes = [
      {
        studentId: createdStudents[0].id,
        contentMd: `# Wiskunde A - Functies en Grafieken

## Lineaire Functies
Een lineaire functie heeft de vorm: **f(x) = ax + b**

### Voorbeelden:
- f(x) = 2x + 3
- g(x) = -x + 5

### Grafiek
De grafiek van een lineaire functie is altijd een **rechte lijn**.

### Eigenschappen:
- **Richtingscoëfficiënt (a)**: bepaalt de helling
- **Startwaarde (b)**: snijpunt met y-as

## Kwadratische Functies
Een kwadratische functie heeft de vorm: **f(x) = ax² + bx + c**

### Voorbeelden:
- f(x) = x² - 4x + 3
- g(x) = -2x² + 6x - 1

### Grafiek
De grafiek is een **parabool**.

### Top van de parabool:
x = -b/(2a)`,
        subject: 'wiskunde-a',
        level: 'havo-4',
        topic: 'functies-en-grafieken',
        driveFileId: 'sample_drive_file_1',
        driveFileName: 'Wiskunde_A_Functies_Emma.pdf'
      },
      {
        studentId: createdStudents[1].id,
        contentMd: `# Statistiek - Centrummaten

## Gemiddelde
Het **rekenkundig gemiddelde** wordt berekend door alle waarden op te tellen en te delen door het aantal waarden.

### Formule:
**x̄ = (x₁ + x₂ + ... + xₙ) / n**

### Voorbeeld:
Gegeven: 5, 8, 12, 15, 20
Gemiddelde = (5 + 8 + 12 + 15 + 20) / 5 = 60 / 5 = 12

## Mediaan
De **mediaan** is de middelste waarde van een geordende dataset.

### Bepaling:
1. Rangschik de waarden van klein naar groot
2. Bij oneven aantal: middelste waarde
3. Bij even aantal: gemiddelde van de twee middelste waarden

### Voorbeeld:
Dataset: 3, 7, 9, 12, 15
Mediaan = 9 (middelste waarde)

## Modus
De **modus** is de waarde die het meest voorkomt.

### Voorbeeld:
Dataset: 2, 3, 3, 4, 5, 3, 6
Modus = 3 (komt 3 keer voor)`,
        subject: 'statistiek',
        level: 'havo-5',
        topic: 'centrummaten',
        driveFileId: 'sample_drive_file_2',
        driveFileName: 'Statistiek_Centrummaten_Lucas.pdf'
      },
      {
        studentId: createdStudents[2].id,
        contentMd: `# Scheikunde - Atoombouw

## Atoommodel van Bohr
Het atoom bestaat uit:
- **Kern**: protonen (+) en neutronen (0)
- **Elektronenwolken**: elektronen (-)

## Atoomnummer en Massagetal
- **Atoomnummer (Z)**: aantal protonen
- **Massagetal (A)**: aantal protonen + neutronen
- **Aantal elektronen**: gelijk aan aantal protonen (in neutraal atoom)

### Voorbeeld: Koolstof (C)
- Atoomnummer: 6
- Massagetal: 12
- Aantal protonen: 6
- Aantal neutronen: 6
- Aantal elektronen: 6

## Isotopen
Isotopen zijn atomen van hetzelfde element met verschillende massagetallen.

### Voorbeeld: Koolstof
- ¹²C: 6 protonen, 6 neutronen
- ¹³C: 6 protonen, 7 neutronen
- ¹⁴C: 6 protonen, 8 neutronen

## Elektronenconfiguratie
Elektronen verdelen zich over schillen:
- K-schil: maximaal 2 elektronen
- L-schil: maximaal 8 elektronen
- M-schil: maximaal 18 elektronen`,
        subject: 'scheikunde',
        level: 'havo-4',
        topic: 'atoombouw',
        driveFileId: 'sample_drive_file_3',
        driveFileName: 'Scheikunde_Atoombouw_Sophie.pdf'
      },
      {
        studentId: createdStudents[3].id,
        contentMd: `# Natuurkunde - Krachten

## Eerste Wet van Newton (Traagheidswet)
Een voorwerp in rust blijft in rust, een voorwerp in beweging blijft in beweging, tenzij er een kracht op werkt.

## Tweede Wet van Newton (F = m × a)
**F = m × a**

Waarbij:
- F = kracht (N)
- m = massa (kg)
- a = versnelling (m/s²)

### Voorbeeld:
Een auto van 1200 kg versnelt met 2 m/s².
F = 1200 × 2 = 2400 N

## Derde Wet van Newton (Actie = Reactie)
Voor elke kracht bestaat een even grote, tegengestelde kracht.

### Voorbeeld:
Als je tegen een muur duwt, duwt de muur even hard terug.

## Zwaartekracht
**Fz = m × g**

Waarbij:
- Fz = zwaartekracht (N)
- m = massa (kg)
- g = valversnelling (9,81 m/s²)

### Voorbeeld:
Een persoon van 70 kg:
Fz = 70 × 9,81 = 686,7 N`,
        subject: 'natuurkunde',
        level: 'havo-5',
        topic: 'krachten',
        driveFileId: 'sample_drive_file_4',
        driveFileName: 'Natuurkunde_Krachten_Noah.pdf'
      },
      {
        studentId: createdStudents[4].id,
        contentMd: `# Biologie - Celstructuur

## Plantencel vs Dierencel

### Algemene organellen:
- **Celkern**: bevat DNA
- **Cytoplasma**: vloeistof waarin organellen liggen
- **Celmembraan**: scheidt cel van omgeving
- **Mitochondriën**: energieproductie (ATP)
- **Ribosomen**: eiwitsynthese

### Alleen in plantencellen:
- **Celwand**: stevige wand van cellulose
- **Chloroplasten**: fotosynthese
- **Vacuole**: opslag van water en voedingsstoffen

### Alleen in dierencellen:
- **Centriolen**: celdeling

## Fotosynthese
**6CO₂ + 6H₂O + lichtenergie → C₆H₁₂O₆ + 6O₂**

### Proces:
1. **Lichtreactie**: in chloroplasten, lichtenergie wordt omgezet
2. **Donkerreactie**: CO₂ wordt omgezet in glucose

### Factoren die fotosynthese beïnvloeden:
- Lichtintensiteit
- CO₂-concentratie
- Temperatuur
- Waterbeschikbaarheid`,
        subject: 'biologie',
        level: 'havo-4',
        topic: 'celstructuur',
        driveFileId: 'sample_drive_file_5',
        driveFileName: 'Biologie_Celstructuur_Lieke.pdf'
      }
    ];

    for (const noteData of sampleNotes) {
      const note = await prisma.note.create({
        data: noteData,
      });
      console.log(`   ✅ Created note: ${noteData.subject} - ${noteData.topic} for ${createdStudents.find(s => s.id === noteData.studentId)?.displayName}`);
    }

    // Create sample key concepts
    console.log('\n🔑 Creating sample key concepts...');
    
    const keyConcepts = [
      {
        driveFileId: 'sample_drive_file_1',
        term: 'Lineaire functie',
        explanation: 'Een functie van de vorm f(x) = ax + b, waarvan de grafiek een rechte lijn is.',
        example: 'f(x) = 2x + 3',
        orderIndex: 1,
        isAiGenerated: true
      },
      {
        driveFileId: 'sample_drive_file_1',
        term: 'Richtingscoëfficiënt',
        explanation: 'De waarde a in een lineaire functie f(x) = ax + b, die de helling van de lijn bepaalt.',
        example: 'In f(x) = 3x + 2 is de richtingscoëfficiënt 3',
        orderIndex: 2,
        isAiGenerated: true
      },
      {
        driveFileId: 'sample_drive_file_2',
        term: 'Gemiddelde',
        explanation: 'Het rekenkundig gemiddelde is de som van alle waarden gedeeld door het aantal waarden.',
        example: 'Gemiddelde van 5, 8, 12 is (5+8+12)/3 = 8,33',
        orderIndex: 1,
        isAiGenerated: true
      },
      {
        driveFileId: 'sample_drive_file_3',
        term: 'Isotoop',
        explanation: 'Atomen van hetzelfde element met verschillende massagetallen door verschillende aantallen neutronen.',
        example: '¹²C en ¹⁴C zijn isotopen van koolstof',
        orderIndex: 1,
        isAiGenerated: true
      }
    ];

    for (const conceptData of keyConcepts) {
      const concept = await prisma.keyConcept.create({
        data: conceptData,
      });
      console.log(`   ✅ Created key concept: ${conceptData.term}`);
    }

    // Create sample teacher
    console.log('\n👨‍🏫 Creating sample teacher...');
    
    const teacher = await prisma.teacher.upsert({
      where: { email: 'lessons@stephensprivelessen.nl' },
      update: {},
      create: {
        email: 'lessons@stephensprivelessen.nl',
        name: 'Stephen',
        role: 'admin'
      },
    });
    console.log(`   ✅ Created teacher: ${teacher.name} (${teacher.email})`);

    // Create sample user for NextAuth
    console.log('\n👤 Creating sample user...');
    
    const user = await prisma.user.upsert({
      where: { email: 'lessons@stephensprivelessen.nl' },
      update: {},
      create: {
        email: 'lessons@stephensprivelessen.nl',
        name: 'Stephen',
        emailVerified: new Date(),
      },
    });
    console.log(`   ✅ Created user: ${user.name} (${user.email})`);

    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${createdStudents.length} students created`);
    console.log(`   - ${sampleNotes.length} notes created`);
    console.log(`   - ${keyConcepts.length} key concepts created`);
    console.log(`   - 1 teacher created`);
    console.log(`   - 1 user created`);

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
seedSampleData();
