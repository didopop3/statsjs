x = ["X1","X2", "X3", "X4","X5"]
v = "abcde"
Y=["a","b","c","d","e"]
for i,vali in enumerate(x):  
    y = Y[i]
    for j,valj in enumerate(x[i+1:]):  
        new_char = v[x.index(valj)]
        reject = df.loc[(df['col1'] == vali) & (df['col2'] == valj)]['col3'].values[0]
        if not reject:
#         if false, append the new char to the given char unless there is a false link
            n_reject = df.loc[(df['col2'] == vali) & (df['col3'] == True)]
#             check any result conflict with previous pairs

            if n_reject.shape[0]>0:
#         if there is, then the found element with the current element, they can't share the same char, so 
#         the char can't be add to the current element but has to be add to the other one in the pair
        
                check_Y = [Y[x.index(d)] for d in n_reject['col1'].values]
                if any([(new_char in yi)   for yi in check_Y]):

                    Y[x.index(valj)] = Y[x.index(valj)]+v[x.index(vali)]
                else:
                    y = y+new_char
            else:
                y = y+new_char

    Y[i]=y           

Y = ["".join(sorted(set(e))) for e in Y]

# simplify Y
# if the letter is covered by other letter
rm_list = []
for l in v:   
    letter_list = [yi for yi in Y if l in yi]
    if len(letter_list) == 1:
        if len(letter_list[0]) >1:
            #  remove l from Y, because it doesn't bring new info
            rm_list.append(l)     
    else:
#         remove l if l is convered by other letter
        check_list =  v[v.index(l) +1 : ]
        covered_letter_list = []
        for i in check_list:
            covered_letter = all([(i in x) for x in letter_list])
            if covered_letter:
                covered_letter_list.append(i)
            if len(covered_letter_list) > 0:
                rm_list.append(l)
                break
                
for char in rm_list:   
    for i,e in enumerate(Y):
        e = e.replace(char,"")
        Y[i]=e
         
char_list = {}
for l in v:
    n = 0 
    for x in rm_list:
        if l > x:
            n = n +1
    char_list[l]=n        
        
for i,el in enumerate(Y):
    for ind,char in enumerate(v):
        el = el.replace(char,v[ind-char_list[char]])
        Y[i]=el
            
