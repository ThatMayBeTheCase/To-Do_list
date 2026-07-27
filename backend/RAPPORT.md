# AWS Cloud

## Inledning

I det här projektet har jag jobbat med att få ett Spring Boot API att köra i AWS. Jag har fokuserat på den första delen av uppgiften, alltså flödet med API Gateway, Lambda, EC2 och RDS.

Processen kan beskrivas såhär:

```text
API Gateway -> Lambda -> EC2 -> RDS
```

Kortfattat betyder det ungefär att användaren inte går direkt till servern eller databasen. Användaren skickar ett anrop till API Gateway. API Gateway skickar vidare till Lambda. Lambda skickar vidare till Spring Boot applikationen som kör på EC2. Spring Boot pratar sedan med databasen i RDS (MySQL).

Tanken med detta är att API:t ska fungera, men också att resurserna inte ska vara öppna mer än det behövs.

## Arkitekturen

Jag använder API Gateway som den publika ingången till systemet. Det är den URL:en som jag testar med i till exempel Insomnia eller `curl` om man vill använda terminalen istället.

Lambda är en proxy som fungerar som en mellanhand. Den gör inte själva CRUD-logiken, utan den skickar bara vidare anropet till EC2. Den läser vilken metod som används, tex. `GET`, `POST`, `PUT` eller `DELETE`, och vilken path som anropas, tex. `/api/tasks` eller `/api/tasks/{id}` etc.

EC2 är servern där Spring Boot applikationen kör. Applikationen kör på port 8080. Jag har lagt upp Spring Boot projektet som en JAR-fil på EC2 och kör den med systemd, så att den fortsätter köra även om jag stänger SSH terminalen.

RDS är databasen. Jag använder MySQL då det är det vi användt och lärt oss mest om. Spring Boot ansluter till RDS med JPA. JPA i princip översätter Java-koden till SQL så att man inte behöver skriva SQL själv.

Flödet:

```text
Insomnia/curl
-> API Gateway
-> Lambda
-> EC2 med Spring Boot
-> RDS MySQL
```

## Spring Boot

I Java koden använder jag en vanlig Spring Boot struktur som nedan:

```text
Controller -> Service -> Repository -> Entity
```

`TaskController` tar emot HTTP-anropen. Där finns CRUD-endpointsen:

```text
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/{id}
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
```

CRUD betyder skapa, läsa, uppdatera och ta bort(Create, Read, Update, Delete).

Controller klassen gör inte allt själv. Den skickar vidare till `TaskService`. Service klassen innehåller själva logiken. Tex. när en task skapas så hämtar service klassen först rätt user och category från databasen, skapar ett nytt `Task` objekt och sparar det.

`TaskRepository` är kopplingen till databasen. Det ärver från `JpaRepository`, och därför får jag färdiga metoder som dessa:

```text
findAll
findById
save
deleteById
```

Det betyder alltså att jag inte behöver skriva vanlig SQL för varje CRUD operation. Spring Data JPA och Hibernate sköter mycket av det bakom kulisserna.

`Task` är en entity. Det betyder att Java klassen motsvarar en tabell i databasen. Fält som `title`, `description` och `completed` blir kolumner i databasen.

Med simpla ord:

```text
Controller tar emot anropet.
Service bestämmer vad som ska göras.
Repository pratar med databasen.
Entity beskriver datan.
```

## Lambda

Lambda-funktionen heter `ToDoList-proxy`. Den fungerar som en proxy mellan API Gateway och EC2.

När API Gateway anropar Lambda får Lambda ett `event`. Det innehåller information om anropet, tex.:

```text
HTTP-metod
path
headers
body
query string
```

Lambda koden plockar ut de värdena och bygger sedan en ny request till EC2:s privata IP på port 8080.

Ex:

```text
GET /api/tasks
```

blir typ:

```text
GET http://EC2privateIP:8080/api/tasks
```

Det viktiga är dock att Lambda inte sparar något i databasen själv. Lambda skickar bara vidare requesten. Det är Spring Boot applikationen på EC2 som gör CRUD logiken och pratar med RDS/MySQL(databasen).

## IAM

IAM används för att bestämma vad AWS resurserna får göra.

Lambda har en "execution" role. Den rollen gör att Lambda kan skriva loggar till CloudWatch och att Lambda kan köras i VPC:n.

Den viktiga behörigheten här är:

```text
AWSLambdaVPCAccessExecutionRole
```

Den behövs för att Lambda ska kunna nå EC2 inne i VPC:n.


```text
IAM-roll = vad en AWS tjänst får göra
```

Jag har inte lagt AWS access keys i koden då dem inte ska vara tillgängliga på github eller dylikt.

## Security Groups

Security Groups fungerar som brandväggar.

Jag har tre viktiga Security Groups:

```text
ToDoList-lambda
ToDoList-ec2
ToDoList-rds
```

`ToDoList-lambda` används av Lambda.

`ToDoList-ec2` används av EC2. Den tillåter port 8080 från Lambda. Det betyder att Spring Boot inte är öppet direkt mot hela internet på port 8080.

`ToDoList-ec2` tillåter också SSH på port 22 från min egen IP-adress som jag skrivit in manuellt. Det behövs för att jag ska kunna logga in på EC2 och driftsätta applikationen.

`ToDoList-rds` används av RDS-databasen. Den tillåter port 3306 bara från EC2. Det betyder också att databasen inte är öppen mot internet.

Kortfattat:

```text
Lambda får prata med EC2 på port 8080.
EC2 får prata med RDS på port 3306.
Min IP får SSH:a till EC2 på port 22.
Internet får inte prata direkt med RDS.
Internet får inte prata direkt med Spring Boot på port 8080.
```

## Privat och publik åtkomst

API Gateway är publik, eftersom användaren måste kunna anropa API:t.

RDS är privat. Den har ingen public access, vilket betyder att man inte ska kunna ansluta direkt till databasen från internet.

EC2 används för att köra Spring Boot. I min lösning använder jag SSH från min egen IP för att kunna komma åt servern. Men själva Spring Boot porten 8080 är inte publik, utan bara öppen från Lambda Security Group.

Det viktigaste är alltså:

```text
API Gateway är dörren in.
Lambda skickar vidare.
EC2 kör Java applikationen.
RDS sparar datan.
Security Groups skyddar trafiken mellan delarna.
```

## Testning

Jag testade API:t via API Gateway med Insomnia.

Jag testade CRUD:

```text
POST /api/tasks
GET /api/tasks
GET /api/tasks/{id}
PUT /api/tasks/{id}
DELETE /api/tasks/{id}
```

När det fungerade visade det att hela kedjan fungerade:

```text
API Gateway
-> Lambda
-> EC2 Spring Boot
-> RDS MySQL
```

Det visade också att Spring Boot kunde spara och hämta data från RDS.

## Min reflektion

Det här projektet var ganska svårt för mig eftersom jag var ny till AWS samt sköt mig själv i foten då jag var sen i kursen. I början kändes det som väldigt många olika delar, VPC, subnets, Security Groups, EC2, RDS, Lambda, IAM och API Gateway. Efter ett tag blev det lättare (men inte lätt) när jag började tänka på det som ett flöde istället.

Det viktigaste jag har lärt mig är att varje tjänst har en egen roll. API Gateway är ingången. Lambda är mellanhanden. EC2 kör applikationen. RDS sparar datan.

Jag har också lärt mig att säkerheten är en stor del av moln. Det räcker inte att bara få applikationen att fungera. Man måste också tänka på vilka portar som är öppna och vilka resurser som får prata med varandra.

Tex. RDS. Om RDS skulle vara öppen mot `0.0.0.0/0` på port 3306 skulle hela internet kunna försöka ansluta till databasen. Därför är det bättre att bara EC2 får prata med RDS.

Jag förstår också bättre varför man använder IAM-roller istället för access keys i koden. Rollen ger en tjänst rätt behörigheter utan att hemliga nycklar behöver ligga i projektet vilket inte funkar om projektet ligger på tex github eller liknande.

Om jag skulle förbättra något hade jag velat göra EC2 ännu mer privat, tex. SSH via egen IP känns inte som en optimal lösning i längden.

## Slutsats

Jag har byggt ett Spring Boot API i AWS med API Gateway, Lambda, EC2 och RDS.

Kortfattat fungerar lösningen typ så här:

```text
API Gateway tar emot anropet.
Lambda skickar vidare anropet.
EC2 kör Spring Boot.
RDS lagrar datan.
```

Resurserna skyddas med IAM-roller, Security Groups och privat/publik åtkomst. IAM styr vad tjänster får göra. Security Groups styr vilken trafik som får gå mellan tjänsterna. Privat och publik åtkomst används för att bara exponera det som behöver vara publikt.

Det jag framför allt tar med mig är att molninfrastruktur handlar mycket om att förstå flödet mellan tjänsterna och att inte öppna mer åtkomst än nödvändigt.

