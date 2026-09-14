1. Project Title
RentEase: A Secure Role-Based Room Rental Management System
2. Introduction
RentEase is a secure web-based Room Rental Management System designed to help landlords, boarders, and applicants manage rental-related activities in an organized, convenient, and secure manner. The system provides landlords with tools to manage rooms, boarders, rental information, payments, and announcements. Borders can access their assigned room information, rental details, payment history, and announcements, while applicants or guests can browse available rooms and submit rental applications through the system. Administrators are responsible for managing users, monitoring system activities, and maintaining the overall security and functionality of the system.
To strengthen information security and prevent unauthorized access, RentEase will implement Role-Based Access Control (RBAC). The system will have four main user roles: Admin, Landlord, Boarder, and Applicant/Guest, with each role assigned specific permissions based on their responsibilities and needs. Each user will have access only to the features and information authorized for their assigned role. This approach helps protect sensitive rental information, prevent unauthorized access, maintain proper access control, and ensure that users can only perform actions appropriate to their respective roles.
Security is particularly important because the system will handle sensitive information such as user accounts, passwords, rental records, payment information, and personal details. To protect this information from unauthorized access, misuse, and other security threats, the system will implement various security mechanisms, including authentication, password protection, authorization, input validation, secure database operations, session security, data protection, and audit logging. These security measures will help maintain the confidentiality, integrity, and availability of the information managed by the system.
3. Problem Statement
The management of room rentals can become challenging when rental information, room availability, tenant records, applications, payments, and announcements are handled through manual or disconnected processes. These practices may result in inaccurate or outdated records, difficulty in monitoring payments, inefficient application processing, and delays in accessing important rental information.

Furthermore, managing rental information involves handling sensitive data such as personal details, user accounts, passwords, rental records, and payment information. Without proper security mechanisms, this information may be exposed to unauthorized access, modification, or misuse. The absence of appropriate role-based access controls may also allow users to access functions or information beyond their responsibilities.
Therefore, there is a need for a secure and centralized Room Rental Management System that can organize rental-related activities while ensuring that information is properly protected and accessible only to authorized users.
Specifically, the study seeks to address the following problems:
1.	How can the system efficiently manage room information, availability, border records, rental information, and payments in a centralized platform?
2.	How can the system provide applicants or guests with a convenient way to view available rooms and submit rental applications?
3.	How can the system provide boarders with convenient access to their assigned room information, rental details, payment history, and announcements?
4.	How can Role-Based Access Control (RBAC) be implemented to ensure that Admins, Landlords, Boarders, and Applicants/Guests can only access authorized features and information?
5.	How can the system protect sensitive user and rental information from unauthorized access, modification, and misuse?
6.	How can security mechanisms such as authentication, password protection, input validation, secure database operations, session security, data protection, and audit logging be implemented to improve the security of the system?
7.	How can the system maintain accurate and traceable records of important user and rental-related activities?
4. Objectives
General Objective
The general objective of the project is to develop a secure web-based Room Rental Management System that enables Admins, Landlords, Boarders, and Applicants/Guests to manage and access rental-related information and services according to their assigned roles and permissions.
Specific Objectives
The project aims to:
1.	Implement a secure registration and login system for users based on their respective roles.
2.	Implement Role-Based Access Control (RBAC) to provide appropriate permissions for Admins, Landlords, Boarders, and Applicants/Guests.
3.	Allow Admins to manage user accounts, roles, and audit logs.
4.	Allow Landlords to manage rooms, room availability, boarders, rental information, payments, and announcements.
5.	Allow Boarders to view and manage their profile, assigned room, rental information, payment history, and announcements.
6.	Allow Applicants/Guests to browse available rooms, view room information, and submit rental applications.
7.	Implement secure password hashing and password protection to protect user credentials.
8.	Implement input validation to prevent invalid or potentially malicious information from being processed.
9.	Implement secure database operations to help prevent SQL injection attacks and unauthorized manipulation of data.
10.	Implement session security to protect authenticated user sessions from unauthorized access.
11.	Protect sensitive user, rental, and payment information from unauthorized access, modification, and misuse.
12.	Record important system activities through an audit trail to support monitoring, accountability, and security tracking.
13.	Implement proper error handling to prevent sensitive technical information from being exposed to users.
14.	Provide backup and recovery mechanisms to help protect the availability and integrity of rental-related records.
5. Scope and Limitations
The project focuses on the development of RentEase, a secure web-based Room Rental Management System designed to assist landlords, boarders, applicants/guests, and administrators in managing and accessing rental-related information through a centralized platform.
The system will include four user roles: Admin, Landlord, Boarder, and Applicant/Guest. Each role will have specific permissions and access to system features based on the implemented Role-Based Access Control (RBAC).
The system will cover the following functionalities:
1.	User Registration and Authentication – Users can register and log in to the system using their credentials. Authentication mechanisms will be implemented to verify user identity and protect user accounts.
2.	Role-Based Access Control – The system will assign permissions based on the user's role. Admins, Landlords, Boarders, and Applicants/Guests will only be able to access features and information authorized for their respective roles.
3.	Admin Management – Admins can manage user accounts, assign or update user roles, monitor system activities, manage security-related settings, and review audit logs.
4.	Room Management – Landlords can add, update, and manage room information, including room availability, rental rates, descriptions, and other relevant room details.
5.	Applicant/Guest Management – Applicants/Guests can browse available rooms, view room information, and submit rental applications through the system.
6.	Application Management – Landlords can review, approve, or reject rental applications submitted by applicants. Approved applicants can be registered or assigned as boarders based on the landlord's decision.
7.	Boarder Management – Landlords can manage boarder information and assign available rooms to approved applicants.
8.	Rental Management – The system will allow landlords and boarders to access relevant rental information, including room assignments, rental rates, and rental-related records.
9.	Payment Management – Landlords can record and manage rental payments, while boarders can view their payment history and relevant payment information.
10.	Announcements – Landlords can post rental-related announcements that can be viewed by boarders.
11.	Security Features – The system will implement security mechanisms such as password hashing, input validation, secure database operations, session security, authorization, data protection, and error handling.
12.	Audit Trail – Important system activities will be recorded to support monitoring, accountability, and security tracking.
13.	Backup and Recovery – The system will provide mechanisms for backing up and recovering important rental-related records to help maintain data availability and integrity.


Limitations of the Study

Despite the features included in RentEase, the system will have the following limitations:

1.	The system is primarily designed for room rental management and does not cover other types of property rentals such as houses, apartments, commercial spaces, or large property management operations.
2.	The system will not function as an online payment gateway. Payment information will primarily be recorded and managed within the system rather than automatically processing transactions through banks or third-party payment providers.
3.	The system will not provide legal services or automatically generate legally binding rental contracts. Any rental agreements or legal documents will remain the responsibility of the landlord and boarder.
4.	The system will not guarantee the physical availability or condition of rental rooms. Room availability and information displayed in the system will depend on the accuracy and timeliness of information provided by the landlord.
5.	Applicants/Guests will have limited access to the system and will only be able to access publicly available room information and application-related features until their application is approved.
6.	Boarders will only be able to access rental and payment information associated with their own account and assigned room.
7.	Landlords will only be able to manage rental information and resources associated with their authorized account or property.
8.	The security mechanisms implemented by the system are intended to reduce common security risks but cannot guarantee complete protection against all possible cyberattacks, vulnerabilities, or security threats.
9.	The effectiveness of backup and recovery will depend on the availability, configuration, and reliability of the storage or database infrastructure used by the system.
10.	The system will depend on an internet connection and compatible web browser for users to access its web-based features.



7. System Features

1. Applicant/Guest

The Applicant/Guest is a potential boarder who can browse available rooms and submit an application before becoming an approved boarder. 

System Features:

●	Browse available rooms
●	View room details
●	View rental rates
●	View room availability
●	Register for an account
●	Log in to the system
●	Complete and submit a rental application
●	View application status

2. Boarder
The Boarder is a registered tenant who has been approved by the landlord and assigned to a rental room.
System Features:
●	Secure login and authentication
●	View and update personal profile
●	View assigned room information
●	View rental information
●	View rental rate and billing details
●	View payment history
●	View rental-related announcements
●	Change account password
3. Landlord
The Landlord is responsible for managing rooms, applicants, boarders, rental information, payments, and announcements related to their rental property.
System Features:
●	Secure login and authentication
●	Manage landlord profile
●	Add, edit, and remove room listings
●	Manage room availability
●	Manage room information and rental rates
●	View and manage applicant applications
●	Approve or reject rental applications
●	Assign rooms to approved boarders
●	Manage boarder information
●	Manage rental records
●	Record and update rental payments
●	View payment records
●	Post and manage announcements
●	View relevant rental and payment information
4. Admin
The Admin is responsible for managing the overall system, user accounts, access permissions, and security monitoring.
System Features:
●	Secure login and authentication
●	Manage user accounts
●	View and manage user information
●	Assign and manage user roles
●	Activate or deactivate user accounts
●	Monitor user login activities
●	View and manage audit logs
●	Perform or manage data backup and recovery 

SECURITY IMPLEMENTATION PLAN 
Security Feature	Implementation Plan
Authentication	Users must provide valid login credentials, such as an email/username and password, before accessing protected areas of the system. Authentication will verify the identity of users before granting access.
Password Security	User passwords will be securely hashed before being stored in the database. Passwords will not be stored in plain text.
Role-Based Access Control (RBAC)	The system will assign users one of four roles: Admin, Landlord, Boarder, or Applicant/Guest. Each role will have specific permissions and access to features based on its responsibilities.
Authorization	The system will verify the user's role and permissions before allowing access to specific pages, functions, or data. Users will only be permitted to perform actions authorized for their assigned role.
Input Validation	User inputs will be validated and sanitized before being processed or stored in the database to help prevent invalid, unexpected, or malicious data from entering the system.
SQL Injection Prevention	Parameterized queries or other secure database operations will be used when communicating with the database to help prevent SQL injection attacks and unauthorized database manipulation.
Session Security	Secure user sessions will be established after successful authentication. Sessions will be properly managed and terminated when users log out or when the session expires.
Data Protection	Sensitive information, including personal details, account credentials, rental records, and payment information, will be protected from unauthorized access, modification, and misuse.
Audit Trail	Important system activities, such as login attempts, adding records, updating information, deleting records, role changes, and administrative actions, will be recorded to support monitoring, accountability, and security investigation.
Error Handling	System errors will be handled appropriately without exposing sensitive technical information, such as database credentials, server details, file paths, or internal system errors, to users.
Backup and Recovery	Important rental and system data will be regularly backed up to help prevent data loss and support the recovery and availability of information in case of system failure or data corruption.

