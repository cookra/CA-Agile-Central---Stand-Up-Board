require 'fileutils'

def writeFile(path, content)
  File.open(path, "w") do |file|
    file.write(content)
  end
end

def write_out_file(filename, new_html, concatenated_css, concatenated_js)
  puts "\n\tCreating merged app html file #{filename}..."
  File.open(filename, "w") do |file|
    style_tag = "    <style type=\"text/css\">\n#{concatenated_css}\n    </style>\n"
    script_tag = "    <script type=\"text/javascript\">\n#{concatenated_js}\n    </script>"
    content = new_html.sub("<!-- insert concatenated CSS here -->", style_tag)
    content = content.sub("<!-- insert concatenated JS here -->", script_tag)
    content = content.sub(/\<script.*\/apps\/(.+)\/sdk.js.*\<\/script>/, "<script type=\"text/javascript\" src=\"/apps/\\1/sdk.js\"></script>")
    file.write(content)
    puts "\t#{filename} successfully created!\n\n"
  end
end

desc "Merge all css and js into one app html file"
task :combine do |t, args|
  first_css = true
  first_js = true
  Dir.chdir(Rake.original_dir)
  app_files = FileList['*.template.html']
  app_files.each do |app_file|
    new_html = ""
    puts("\nProcessing #{app_file}...")
    script_names = []
    stylesheet_names = []
    IO.foreach(app_file) do |line|
      # If the line refers to script content contained in a local file, save the name of the file for later
      if    !(line =~ /<script.*src="https*:/) \
 && !(line =~ /<script.*src="\/slm/)   \
 && !(line =~ /\/sdk.js/) \
 && line =~ /<script.*src="(.*)"/ 
        script_file = $1
        script_names << script_file
        if first_js
          new_html << "\n<!-- insert concatenated JS here -->\n"
          first_js = false
        end
        # or if the line pulls in a CSS stylesheet from a local file, save the name of the file for later
      elsif    (line !~ /<link .*href="https?:\/\//) \
 && (line !~ /<link.*href="\/slm/)   \
 && (line =~ /<link.*href="(.*\.css)"/) 
        stylesheet_names << $1
        if first_css
          new_html << "\n<!-- insert concatenated CSS here -->\n"
          first_css = false
        end
      else
        new_html << line
      end
    end

    concatenated_css = "\n    "
    stylesheet_names.each do |stylesheet_name|
      puts "\tConcatenating #{stylesheet_name}..."
      lines = IO.readlines(stylesheet_name)
      lines.each do |l|
        concatenated_css << '    ' << l.to_s.gsub(/\n/, "\n    ")
      end
      concatenated_css << "\n    "
    end

    concatenated_js = "\n    "
    script_names.each do |script_name|
      lines = IO.readlines(script_name)
      first_js = lines.first
      puts "\tConcatenating #{script_name}..."
      lines.each do |l|
        concatenated_js << '    ' << l.to_s.gsub(/\n/, "\n    ")
      end
      concatenated_js << "\n\n    "
    end

    output_filename = app_file.sub(/\.template\.html$/, 'App.html')
    write_out_file(output_filename, new_html, concatenated_css, concatenated_js)

  end
end

desc "Runs JSLint on all app JavaScript files"
task :jslint do |t, args|

  #Find all scripts in this app
  Dir.chdir(Rake.original_dir)
  puts "\nRunning jslint..."
  script_names = []
  templates = FileList['*.template.html']
  templates.each do |template|
    IO.foreach(template) do |line|
      if    !(line =~ /<script.*src="https*:/) \
 && !(line =~ /<script.*src="\/slm/)   \
 && !(line =~ /\/sdk.js/) \
 && line =~ /<script.*src="(.*)"/
        script_names << $1
      end
    end
  end

    #Run jslint
  jslint_jar = "#{Rake.application.find_rakefile_location()[1]}/lib/jslint4java.jar".gsub("/", File::ALT_SEPARATOR || File::SEPARATOR)
  script_names.each do |script_name|
    puts
    puts "-------JSLint output for #{script_name}--------------"
    puts `java -Xmx256M -jar "#{jslint_jar}" --browser --cap --debug --devel --evil --fragment --laxbreak --on #{script_name}`
  end
end

desc "Run jslint and combine"
task :deploy do |t, args|
  Rake::Task[:jslint].invoke()
  Rake::Task[:combine].invoke()
end

desc "Default task (equivalent to deploy)"
task :default do |t, args|
  Rake::Task[:deploy].invoke()
end

desc "Create a new app"
task :new, :app_name do |t, args|
  app_name = args.app_name
  if (!File.directory? "./#{app_name}")

    template_dir = "#{Rake.application.find_rakefile_location()[1]}/lib"
    app_class = app_name[0, 1].downcase << app_name[1, app_name.length-1]

    puts "\nCreating directory #{app_name}..."
    Dir.mkdir "./#{app_name}"

    puts "\tCreating #{app_name}.css..."
    css_template = IO.read("#{template_dir}/App.css")
    writeFile("./#{app_name}/#{app_name}.css", css_template.gsub("APP_CLASS", app_class))

    puts "\tCreating #{app_name}.js..."
    js_template = IO.read("#{template_dir}/App.js")
    writeFile("./#{app_name}/#{app_name}.js", js_template.gsub("APP_NAME", app_name))

    puts "\tCreating #{app_name}.template.html...\n\n"
    app_template = IO.read("#{template_dir}/App.template.html")
    writeFile("./#{app_name}/#{app_name}.template.html",
              app_template.gsub("APP_NAME", app_name).gsub("APP_CLASS", app_class))
  else
    puts "\nDirectory #{app_name} already exists!\n\n"
  end
end
