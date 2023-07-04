# Setting up ordfs-server on DigitalOcean App Platform
## Go from zero to a self-hosted Bitcoin website in just five minutes!

1. Fork the [ordfs-server repository on GitHub](https://github.com/shruggr/ordfs-server).
2. Log into your DigitalOcean dashboard.
3. Navigate to "Apps" in the "Manage" menu.
4. Click on "Create App".
5. Select "Github" as your source.
6. Update your GitHub permissions to allow access to your forked repository.
7. Select your forked repository.
8. Select the main branch and leave the source directory as default.
9. Make sure "Autodeploy" is checked.
10. Click "Next".
11. Next to the generated app name, click "Edit".
12. Change the app name to your preferred name and click back.
13. Click "Edit Plan", choose "Basic", then click "Back".
14. Keep clicking "Next" until you get to the "Review" stage.
15. Click on "Create Resources".
16. Wait for the deployment to complete.
17. Visit the setup page by clicking the link in the header.
18. Navigate to Settings.
19. Click "Edit" next to "Domains".
20. Click on "Add Domain".
21. Enter your domain name.
22. Choose the option "You manage your domain".
23. Copy the provided CNAME alias.
24. Add the CNAME record for your domain or subdomain at your registrar. 
    - Note: If your registrar doesn't support CNAME flattening and you want to use a root domain, you should use DigitalOcean's nameservers.
25. Wait for the DNS propagation to complete.
26. Visit your domain to see the setup page.

Congratulations, your self-hosted Bitcoin website is now set up! Follow the inscructions on the setup page to get started.
