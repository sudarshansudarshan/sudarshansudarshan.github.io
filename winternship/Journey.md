---
layout: page
title: Journey
permalink: /journey/
---

**Note**: The lessons and videos here are meant for students to learn linearly and in a self paced way. This may or may not contain all the lectures that was taught in the class. This may not also be in the same sequence of concepts taught in the class. These are more organized than the class room lectures and we strongly recommend that you use this as your roadmap. 
<table>
  <thead>
    <tr>
      <th>Sl. No</th>
      <th>Journey </th>
      <th>Date Uploaded</th> 
    </tr>
  </thead>
  <tbody>
    {% for post in site.posts reversed %}
    <tr>
      <td>{{ forloop.index }}</td>
      <td><a href="{{ post.url | relative_url }}">{{ post.title }}</a></td>
      <td>{{ post.date | date: "%d-%B-%Y" }}</td> 
    </tr>
    {% endfor %}
  </tbody>
</table>

